import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ error: 'Reference required' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    })

    const data = await response.json()

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({
        status: 'failed',
        message: 'Payment was not successful',
      })
    }

    // Check if this payment was already processed
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingPurchase) {
      // Already processed, return success
      return NextResponse.json({
        status: 'success',
        message: 'Payment verified',
      })
    }

    // Payment successful but not yet processed (webhook might be delayed)
    // The webhook will handle the actual credit/purchase update
    return NextResponse.json({
      status: 'success',
      message: 'Payment successful! Your credits will be added shortly.',
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
