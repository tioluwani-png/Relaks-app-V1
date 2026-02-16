import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { transformPhotoToColoring } from '@/lib/ai'
import { uploadAIImage } from '@/lib/upload-ai-image'
import { checkRateLimit } from '@/lib/rate-limit'

const CREDIT_COST = 5
const MAX_GENERATIONS_PER_HOUR = 10
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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

    // 4. Validate file type strictly
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be a JPEG, PNG, or WebP image' }, { status: 400 })
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
      .select('ai_credits, is_banned')
      .eq('id', user.id)
      .single()

    const userInfo = userData as { ai_credits: number; is_banned: boolean } | null
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

    // 9. Validate magic bytes
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer.slice(0, 12))
    if (!isValidImageBytes(bytes)) {
      return NextResponse.json({ error: 'File does not appear to be a valid image' }, { status: 400 })
    }

    // 10. Convert and generate
    const imageBuffer = Buffer.from(arrayBuffer)
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
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // 13. Deduct credits (via admin client)
    await supabaseAdmin
      .from('users')
      .update({ ai_credits: userInfo.ai_credits - CREDIT_COST } as never)
      .eq('id', user.id)

    return NextResponse.json({
      generation,
      credits_remaining: userInfo.ai_credits - CREDIT_COST,
    })
  } catch (error) {
    console.error('Error converting photo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert photo' },
      { status: 500 }
    )
  }
}

function isValidImageBytes(bytes: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true
  return false
}
