import sharp from 'sharp'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export type AIStyle = 'mandala' | 'floral' | 'animals' | 'abstract' | 'portrait' | 'landscape'
export type AIComplexity = 'simple' | 'medium' | 'detailed'

// User-facing error messages (never expose provider details)
export const AI_ERRORS = {
  IMAGE_FORMAT: 'This image couldn\'t be processed. Please try a different photo.',
  GENERATION_FAILED: 'Couldn\'t generate this one — please try again.',
  CONTENT_POLICY: 'This image contains content that cannot be processed. Please try a different photo.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  CONFIG_ERROR: 'Service temporarily unavailable. Please try again later.',
} as const

// Custom error class to distinguish user-safe errors
export class AIError extends Error {
  public readonly userMessage: string
  public readonly logDetails: Record<string, unknown>

  constructor(userMessage: string, logDetails: Record<string, unknown> = {}) {
    super(userMessage)
    this.name = 'AIError'
    this.userMessage = userMessage
    this.logDetails = logDetails
  }
}

const stylePrompts: Record<AIStyle, string> = {
  mandala: 'intricate mandala pattern with symmetrical geometric designs',
  floral: 'beautiful floral arrangement with various flowers and leaves',
  animals: 'cute animal illustration with natural elements',
  abstract: 'abstract flowing patterns and shapes',
  portrait: 'elegant portrait outline with decorative elements',
  landscape: 'serene landscape scene with nature elements',
}

const complexityModifiers: Record<AIComplexity, string> = {
  simple: 'with minimal details, large clear sections, suitable for beginners',
  medium: 'with moderate detail level, balanced complexity',
  detailed: 'with intricate fine details, many small sections for advanced colorists',
}

/**
 * Normalize image to a clean PNG in RGB mode that AI APIs accept.
 * Handles HEIC, JPEG, PNG, WebP, strips alpha, converts CMYK to RGB.
 */
export async function normalizeImageForAI(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Use sharp to normalize the image
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()

    // Log original format for debugging
    console.log('[AI] Normalizing image:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
      space: metadata.space,
    })

    // Build the processing pipeline
    let pipeline = image
      // Remove alpha channel and flatten to white background (handles RGBA → RGB)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      // Ensure sRGB color space (handles CMYK, other color spaces)
      .toColorspace('srgb')

    // Resize if too large (OpenAI limit is 4MB, but we target reasonable dimensions)
    // Keep aspect ratio, max 2048 on longest side
    if (metadata.width && metadata.height) {
      const maxDim = Math.max(metadata.width, metadata.height)
      if (maxDim > 2048) {
        pipeline = pipeline.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true,
        })
      }
    }

    // Convert to PNG (clean, no compression artifacts)
    const normalizedBuffer = await pipeline
      .png({ compressionLevel: 6 })
      .toBuffer()

    console.log('[AI] Image normalized successfully, size:', normalizedBuffer.length)
    return normalizedBuffer
  } catch (error) {
    console.error('[AI] Image normalization failed:', error)
    throw new AIError(AI_ERRORS.IMAGE_FORMAT, {
      stage: 'normalization',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Parse API error and return appropriate user message
 */
function parseAPIError(
  error: { error?: { message?: string; code?: string; type?: string } },
  requestId: string | null
): { userMessage: string; logMessage: string } {
  const errorMessage = error.error?.message || 'Unknown error'
  const errorCode = error.error?.code || 'unknown'
  const errorType = error.error?.type || 'unknown'

  // Determine user-friendly message based on error type
  let userMessage: string = AI_ERRORS.GENERATION_FAILED

  if (errorMessage.includes('Invalid image') || errorMessage.includes('image file') || errorMessage.includes('mode')) {
    userMessage = AI_ERRORS.IMAGE_FORMAT
  } else if (errorCode === 'content_policy_violation' || errorType === 'content_policy_violation') {
    userMessage = AI_ERRORS.CONTENT_POLICY
  } else if (errorCode === 'rate_limit_exceeded' || errorMessage.includes('rate limit')) {
    userMessage = AI_ERRORS.RATE_LIMIT
  }

  return {
    userMessage,
    logMessage: `[API Error] code=${errorCode} type=${errorType} requestId=${requestId} message=${errorMessage}`,
  }
}

export async function generateColoringPage(
  prompt: string,
  style: AIStyle,
  complexity: AIComplexity
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new AIError(AI_ERRORS.CONFIG_ERROR, { reason: 'API key not configured' })
  }

  const fullPrompt = `Create a black and white coloring page illustration: ${prompt}.
Style: ${stylePrompts[style]}.
Complexity: ${complexityModifiers[complexity]}.
The image should be clean line art with no shading or colors, only black outlines on white background,
suitable for printing and coloring with colored pencils or markers.
High contrast, clear lines, no gray areas.`

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: '1024x1792',
      quality: 'standard',
      style: 'natural',
    }),
  })

  const requestId = response.headers.get('x-request-id')

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const { userMessage, logMessage } = parseAPIError(errorData, requestId)
    console.error('[AI generateColoringPage]', logMessage)
    throw new AIError(userMessage, {
      requestId,
      status: response.status,
      errorData,
    })
  }

  const data = await response.json()
  return data.data[0].url
}

export async function transformPhotoToColoring(
  imageBuffer: Buffer,
  complexity: AIComplexity
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new AIError(AI_ERRORS.CONFIG_ERROR, { reason: 'API key not configured' })
  }

  // Normalize image to clean PNG in RGB mode
  const normalizedBuffer = await normalizeImageForAI(imageBuffer)

  const prompt = `Transform this exact photo into a clean black-and-white coloring page in Studio Ghibli anime art style.

CRITICAL RULES:
- Preserve the EXACT composition, pose, and framing of the original photo
- Preserve the person's facial proportions and likeness accurately
- Apply Studio Ghibli aesthetic: soft rounded forms, expressive eyes, whimsical charm
- Complexity: ${complexityModifiers[complexity]}
- ONLY thin, clean black outlines on pure white background
- Uniform line weight throughout
- NO shading, NO grayscale, NO fill, NO hatching, NO colors
- Keep the background minimal
- The result must look like a printable coloring page`

  // Use FormData to send the properly normalized PNG
  const formData = new FormData()
  const uint8Array = new Uint8Array(normalizedBuffer)
  const imageBlob = new Blob([uint8Array], { type: 'image/png' })
  formData.append('image[]', imageBlob, 'photo.png')
  formData.append('model', 'gpt-image-1')
  formData.append('prompt', prompt)
  formData.append('size', '1024x1536')
  formData.append('quality', 'high')

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  })

  const requestId = response.headers.get('x-request-id')

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const { userMessage, logMessage } = parseAPIError(errorData, requestId)
    console.error('[AI transformPhotoToColoring]', logMessage)
    throw new AIError(userMessage, {
      requestId,
      status: response.status,
      errorData,
    })
  }

  const data = await response.json()

  // gpt-image-1 returns base64 by default
  const base64Image = data.data[0].b64_json
  if (base64Image) {
    return `data:image/png;base64,${base64Image}`
  }

  // Fallback to URL if returned
  return data.data[0].url
}

export function moderatePrompt(prompt: string): { safe: boolean; reason?: string } {
  const blockedTerms = [
    'nude', 'naked', 'nsfw', 'sexual', 'explicit',
    'violence', 'gore', 'blood', 'weapon', 'gun',
    'drug', 'alcohol', 'cigarette', 'smoking',
    'hate', 'racist', 'offensive'
  ]

  const lowerPrompt = prompt.toLowerCase()

  for (const term of blockedTerms) {
    if (lowerPrompt.includes(term)) {
      return {
        safe: false,
        reason: 'Your prompt contains content that is not allowed. Please try a different description.',
      }
    }
  }

  if (prompt.length < 3) {
    return {
      safe: false,
      reason: 'Prompt is too short. Please provide more detail.',
    }
  }

  if (prompt.length > 200) {
    return {
      safe: false,
      reason: 'Prompt is too long. Please keep it under 200 characters.',
    }
  }

  return { safe: true }
}
