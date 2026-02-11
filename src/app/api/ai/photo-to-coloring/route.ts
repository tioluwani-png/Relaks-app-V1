import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateGhibliColoringPage, describeImage } from '@/lib/ai'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const complexity = (formData.get('complexity') as string) || 'medium'

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 4MB' }, { status: 400 })
    }

    // Check user's AI credits
    const { data: userData } = await supabase
      .from('users')
      .select('ai_credits')
      .eq('id', user.id)
      .single()

    const userCredits = userData as { ai_credits: number } | null
    if (!userCredits || userCredits.ai_credits < 5) {
      return NextResponse.json(
        { error: 'Not enough credits. You need 5 credits per generation.' },
        { status: 402 }
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Step 1: Describe the image using GPT-4o-mini vision
    const description = await describeImage(base64)

    // Step 2: Generate Ghibli-style coloring page from the description
    const validComplexity = ['simple', 'medium', 'detailed'].includes(complexity)
      ? complexity as 'simple' | 'medium' | 'detailed'
      : 'medium'

    const imageUrl = await generateGhibliColoringPage(description, validComplexity)

    // Save generation to database
    const { data: generation, error: dbError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        prompt: `Ghibli photo conversion: ${description.slice(0, 200)}`,
        style: 'abstract',
        complexity: validComplexity,
        result_url: imageUrl,
        is_purchased: false,
      } as never)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Deduct 5 AI credits
    await supabase
      .from('users')
      .update({ ai_credits: userCredits.ai_credits - 5 } as never)
      .eq('id', user.id)

    return NextResponse.json({
      generation,
      credits_remaining: userCredits.ai_credits - 5,
    })
  } catch (error) {
    console.error('Error converting photo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert photo' },
      { status: 500 }
    )
  }
}
