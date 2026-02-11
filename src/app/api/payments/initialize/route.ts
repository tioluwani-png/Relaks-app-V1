import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { initializePayment, generateReference, toKobo, PRICING } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, pageId } = body

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('email, free_pages_remaining')
      .eq('id', user.id)
      .single()

    const userDataTyped = userData as { email: string; free_pages_remaining: number } | null
    if (!userDataTyped) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let amount: number
    let metadata: Record<string, unknown> = {
      user_id: user.id,
      type,
    }

    switch (type) {
      case 'single':
        if (!pageId) {
          return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
        }
        amount = PRICING.singlePage
        metadata.page_id = pageId
        break

      case 'bundle':
        amount = PRICING.bundle10
        break

      case 'unlimited':
        amount = PRICING.unlimited
        break

      case 'ai_starter':
        amount = PRICING.aiStarter
        break

      case 'ai_popular':
        amount = PRICING.aiPopular
        break

      case 'ai_pro':
        amount = PRICING.aiPro
        break

      default:
        return NextResponse.json({ error: 'Invalid purchase type' }, { status: 400 })
    }

    const reference = generateReference()
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`

    const result = await initializePayment(
      userDataTyped.email,
      toKobo(amount),
      reference,
      metadata,
      callbackUrl
    )

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    })
  } catch (error) {
    console.error('Error initializing payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
