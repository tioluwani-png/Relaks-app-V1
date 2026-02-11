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

  const fullPrompt = `Recreate the following scene in Studio Ghibli anime art style as a coloring page: ${description}.
Style: Soft, whimsical Studio Ghibli illustration with rounded forms, expressive characters, lush natural details, and a dreamy atmosphere inspired by films like Spirited Away, My Neighbor Totoro, and Howl's Moving Castle.
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
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in a concise way (under 150 words) focusing on the main subjects, their poses, composition, and key visual elements. This description will be used to generate a coloring page version, so focus on outlines, shapes, and structure rather than colors or lighting.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 200,
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
