import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import {
  grantCreditPurchase,
  grantRentalPurchase,
  EXPECTED_AMOUNTS,
} from '@/lib/payment-fulfillment'
import { sendPurchaseEmail, handleFirstPurchase } from '@/lib/email'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // 1. Verify webhook signature (HMAC-SHA512)
    const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('[webhook] Signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    // 2. Only process successful charges
    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const { data } = event
    const { reference, metadata, amount } = data
    const { user_id, type, page_id, order_id } = metadata

    // 3. Validate metadata exists
    if (!user_id || !type) {
      console.error('[webhook] Missing metadata:', { reference, metadata })
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Handle rental payments
    if (type === 'rental' && order_id) {
      const result = await grantRentalPurchase(supabase, order_id, reference, user_id)

      if (!result.success) {
        console.error('[webhook] Rental fulfillment failed:', result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      if (result.alreadyProcessed) {
        console.log('[webhook] Rental already processed:', { order_id, reference })
      } else {
        console.log('[webhook] Rental fulfilled:', { reference, order_id, user_id, amount })
      }

      return NextResponse.json({ received: true })
    }

    // 4. Verify amount matches expected price for credits
    const expectedAmount = EXPECTED_AMOUNTS[type]
    if (expectedAmount && amount !== expectedAmount) {
      console.error('[webhook] Amount mismatch!', {
        expected: expectedAmount,
        actual: amount,
        reference,
        userId: user_id,
        type,
      })
      return NextResponse.json({ error: 'Amount verification failed' }, { status: 400 })
    }

    // 5. Grant credits (idempotent and atomic)
    const result = await grantCreditPurchase(
      supabase,
      user_id,
      type,
      reference,
      amount,
      page_id
    )

    if (!result.success) {
      console.error('[webhook] Credit fulfillment failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    if (result.alreadyProcessed) {
      console.log('[webhook] Already processed:', reference)
      return NextResponse.json({ received: true })
    }

    console.log('[webhook] Credits granted:', { reference, userId: user_id, type, amount })

    // 6. Send purchase confirmation email (non-blocking)
    const { data: userData } = await supabase
      .from('users')
      .select('email, username')
      .eq('id', user_id)
      .single()

    const userDataTyped = userData as { email: string; username: string } | null

    if (userDataTyped?.email) {
      sendPurchaseEmail(
        userDataTyped.email,
        userDataTyped.username || 'there',
        type,
        amount / 100,
        reference
      ).catch(err => console.error('[webhook] Email error:', err))

      // Check if this is their first purchase
      const { count } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)

      if (count === 1) {
        handleFirstPurchase(userDataTyped.email).catch(err =>
          console.error('[webhook] First purchase tag error:', err)
        )
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
