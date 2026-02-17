import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateColoringPage, moderatePrompt } from '@/lib/ai'
import { uploadAIImage } from '@/lib/upload-ai-image'
import { aiGenerateSchema, validate } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendLowCreditsEmail } from '@/lib/email'

const CREDIT_COST = 5
const MAX_GENERATIONS_PER_HOUR = 10

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Rate limit
    const rateCheck = checkRateLimit(`ai:${user.id}`, MAX_GENERATIONS_PER_HOUR, 60 * 60 * 1000)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetMs / 60000)} minutes.` },
        { status: 429 }
      )
    }

    // 3. Validate input with Zod
    const body = await request.json()
    const validation = validate(aiGenerateSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { prompt, style, complexity } = validation.data

    // 4. Moderate prompt
    const moderation = moderatePrompt(prompt)
    if (!moderation.safe) {
      return NextResponse.json({ error: moderation.reason }, { status: 400 })
    }

    // 5. Use admin client for credit operations (bypasses RLS)
    const supabaseAdmin = await createAdminClient()

    // 6. Check credits and ban status
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('ai_credits, is_banned, email, username')
      .eq('id', user.id)
      .single()

    const userInfo = userData as { ai_credits: number; is_banned: boolean; email: string; username: string } | null
    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userInfo.is_banned) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    if (userInfo.ai_credits < CREDIT_COST) {
      return NextResponse.json(
        { error: `Not enough credits. You need ${CREDIT_COST} credits per generation.` },
        { status: 402 }
      )
    }

    // 7. Sanitize prompt
    const sanitizedPrompt = prompt.replace(/[<>]/g, '').trim()

    // 8. Generate the image
    const tempUrl = await generateColoringPage(sanitizedPrompt, style, complexity)

    // 9. Upload to Supabase Storage for permanent access
    const permanentUrl = await uploadAIImage(supabaseAdmin, tempUrl, user.id)

    // 10. Save generation to database (via admin client)
    const { data: generation, error: dbError } = await supabaseAdmin
      .from('ai_generations')
      .insert({
        user_id: user.id,
        prompt: sanitizedPrompt,
        style,
        complexity,
        result_url: permanentUrl,
        is_purchased: false,
      } as never)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // 11. Deduct credits atomically (via admin client)
    const creditsRemaining = userInfo.ai_credits - CREDIT_COST
    await supabaseAdmin
      .from('users')
      .update({ ai_credits: creditsRemaining } as never)
      .eq('id', user.id)

    // 12. Send low credits email if they can't afford another generation
    if (creditsRemaining < CREDIT_COST && userInfo.email) {
      sendLowCreditsEmail(userInfo.email, userInfo.username, creditsRemaining).catch(err =>
        console.error('Failed to send low credits email:', err)
      )
    }

    return NextResponse.json({
      generation,
      credits_remaining: creditsRemaining,
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    )
  }
}
