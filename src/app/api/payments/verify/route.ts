import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  // 1. Validate input
  if (!reference || reference.length < 5 || reference.length > 100) {
    return NextResponse.json({ error: 'Invalid reference' }, { status: 400 })
  }

  try {
    // 2. Authenticate
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Verify payment with Paystack (encode reference to prevent injection)
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const data = await response.json()

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({
        status: 'failed',
        message: 'Payment was not successful',
      })
    }

    // 4. Verify the payment email matches the authenticated user
    if (data.data.customer?.email && data.data.customer.email !== user.email) {
      console.warn('Payment email mismatch:', {
        expected: user.email,
        actual: data.data.customer.email,
        reference,
      })
    }

    // 5. Check if this payment was already processed
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingPurchase) {
      return NextResponse.json({
        status: 'success',
        message: 'Payment verified',
      })
    }

    // Payment successful but not yet processed (webhook might be delayed)
    return NextResponse.json({
      status: 'success',
      message: 'Payment successful! Your credits will be added shortly.',
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
