const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export type AIStyle = 'mandala' | 'floral' | 'animals' | 'abstract' | 'portrait' | 'landscape'
export type AIComplexity = 'simple' | 'medium' | 'detailed'

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

export async function generateColoringPage(
  prompt: string,
  style: AIStyle,
  complexity: AIComplexity
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
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

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to generate image')
  }

  const data = await response.json()
  return data.data[0].url
}

export async function transformPhotoToColoring(
  imageBuffer: Buffer,
  complexity: AIComplexity
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

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

  // Use FormData to send the image file to the edits endpoint
  const formData = new FormData()
  const uint8Array = new Uint8Array(imageBuffer)
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

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to transform image')
  }

  const data = await response.json()

  // gpt-image-1 returns base64 by default
  const base64Image = data.data[0].b64_json
  if (base64Image) {
    // Convert base64 to a data URL that can be fetched later for upload
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
