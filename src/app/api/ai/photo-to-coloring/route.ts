import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { transformPhotoToColoring, AIError, AI_ERRORS } from '@/lib/ai'
import { uploadAIImage } from '@/lib/upload-ai-image'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendLowCreditsEmail } from '@/lib/email'

const CREDIT_COST = 5
const MAX_GENERATIONS_PER_HOUR = 10
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

// We now accept more types since sharp handles conversion
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Rate limit (shared with text generation)
    const rateCheck = checkRateLimit(`ai:${user.id}`, MAX_GENERATIONS_PER_HOUR, 60 * 60 * 1000)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetMs / 60000)} minutes.` },
        { status: 429 }
      )
    }

    // 3. Parse form data
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const complexity = (formData.get('complexity') as string) || 'medium'

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // 4. Validate file type (allow HEIC now)
    const fileType = file.type.toLowerCase()
    if (!ALLOWED_TYPES.includes(fileType) && !fileType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Please upload a JPEG, PNG, WebP, or HEIC image' },
        { status: 400 }
      )
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be under 4MB' }, { status: 400 })
    }

    // 6. Validate complexity
    const validComplexity = ['simple', 'medium', 'detailed'].includes(complexity)
      ? complexity as 'simple' | 'medium' | 'detailed'
      : 'medium'

    // 7. Use admin client for credit operations
    const supabaseAdmin = await createAdminClient()

    // 8. Check credits and ban status
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

    // 9. Convert file to buffer (sharp will handle format detection)
    const arrayBuffer = await file.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // 10. Convert and generate (normalization happens inside transformPhotoToColoring)
    const resultUrl = await transformPhotoToColoring(imageBuffer, validComplexity)

    // 11. Upload to Supabase Storage
    const permanentUrl = await uploadAIImage(supabaseAdmin, resultUrl, user.id)

    // 12. Save generation to database (via admin client)
    const { data: generation, error: dbError } = await supabaseAdmin
      .from('ai_generations')
      .insert({
        user_id: user.id,
        prompt: 'Ghibli photo conversion',
        style: 'abstract',
        complexity: validComplexity,
        result_url: permanentUrl,
        is_purchased: false,
      } as never)
      .select()
      .single()

    if (dbError) {
      console.error('[photo-to-coloring] Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save generation. Please try again.' },
        { status: 500 }
      )
    }

    // 13. Deduct credits AFTER successful generation
    const creditsRemaining = userInfo.ai_credits - CREDIT_COST
    await supabaseAdmin
      .from('users')
      .update({ ai_credits: creditsRemaining } as never)
      .eq('id', user.id)

    // 14. Send low credits email if they can't afford another generation
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
    // Handle our custom AIError (has safe user message)
    if (error instanceof AIError) {
      console.error('[photo-to-coloring] AIError:', error.message, error.logDetails)
      return NextResponse.json(
        { error: error.userMessage },
        { status: 500 }
      )
    }

    // Handle unexpected errors - never expose details
    console.error('[photo-to-coloring] Unexpected error:', error)
    return NextResponse.json(
      { error: AI_ERRORS.GENERATION_FAILED },
      { status: 500 }
    )
  }
}
