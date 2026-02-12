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
      size: '1024x1024',
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

export async function generateGhibliColoringPage(
  description: string,
  complexity: AIComplexity
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const fullPrompt = `Convert this photo description into a clean black-and-white line art coloring page in Studio Ghibli anime style.

Photo description: ${description}

CRITICAL RULES:
- Preserve the exact composition, pose, and framing from the description
- Preserve facial proportions and distinguishing features accurately
- Apply Studio Ghibli anime aesthetic: soft rounded forms, large expressive eyes, simplified but recognizable features, whimsical charm inspired by Spirited Away and Howl's Moving Castle
- Complexity: ${complexityModifiers[complexity]}
- ONLY thin, clean black outlines on pure white background
- Uniform line weight throughout
- NO shading, NO grayscale, NO fill, NO hatching
- NO background clutter — keep it minimal
- The result must look like a printable coloring page suitable for colored pencils or markers`

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
      size: '1024x1024',
      quality: 'hd',
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

export async function describeImage(imageBase64: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Describe this image in precise detail (under 300 words) for recreating it as line art. Include:

1. PEOPLE: Exact number of people, their gender, age range, ethnicity, facial features (face shape, eye shape, nose shape, lip shape, eyebrow shape), hairstyle and length, facial expression, head tilt/angle.
2. POSE & BODY: Body position, hand placement, posture, clothing details (neckline, sleeves, patterns, accessories).
3. COMPOSITION: Framing (close-up, half-body, full-body), camera angle, background elements.
4. PROPORTIONS: Relative sizes, spacing between features, any distinctive physical characteristics.

Be extremely specific about facial proportions and distinguishing features. Describe the exact geometry of features rather than using vague terms. This will be used to generate a line art drawing that should resemble the original as closely as possible.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to analyze image')
  }

  const data = await response.json()
  return data.choices[0].message.content
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
