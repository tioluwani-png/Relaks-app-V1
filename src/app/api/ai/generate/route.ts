import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateColoringPage, moderatePrompt, type AIStyle, type AIComplexity } from '@/lib/ai'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, style, complexity } = body as {
      prompt: string
      style: AIStyle
      complexity: AIComplexity
    }

    // Validate inputs
    if (!prompt || !style || !complexity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Moderate prompt
    const moderation = moderatePrompt(prompt)
    if (!moderation.safe) {
      return NextResponse.json({ error: moderation.reason }, { status: 400 })
    }

    // Check user's AI credits
    const { data: userData } = await supabase
      .from('users')
      .select('ai_credits')
      .eq('id', user.id)
      .single()

    const userCredits = userData as { ai_credits: number } | null
    if (!userCredits || userCredits.ai_credits <= 0) {
      return NextResponse.json(
        { error: 'No AI credits remaining. Please purchase more credits.' },
        { status: 402 }
      )
    }

    // Generate the image
    const imageUrl = await generateColoringPage(prompt, style, complexity)

    // Save generation to database
    const { data: generation, error: dbError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        prompt,
        style,
        complexity,
        result_url: imageUrl,
        is_purchased: false,
      } as never)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Deduct AI credit
    await supabase
      .from('users')
      .update({ ai_credits: userCredits.ai_credits - 1 } as never)
      .eq('id', user.id)

    return NextResponse.json({
      generation,
      credits_remaining: userCredits.ai_credits - 1,
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}
