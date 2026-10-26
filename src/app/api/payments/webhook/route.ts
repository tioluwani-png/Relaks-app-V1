import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import {
  grantCreditPurchase,
  grantRentalPurchase,
  EXPECTED_AMOUNTS,
} from '@/lib/payment-fulfillment'
import { sendPurchaseEmail, handleFirstPurchase } from '@/lib/email'
import { fulfillShopOrder } from '@/lib/shop/fulfillment'
import { fulfillRentalFromWebhook } from '@/lib/rental/fulfillment'

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
    const { user_id, type, page_id, order_id, subscription_id } = metadata

    // 3. Validate metadata exists (user_id not required for shop - allows guest checkout)
    if (!type) {
      console.error('[webhook] Missing type in metadata:', { reference, metadata })
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Handle shop payments - use shared fulfillment function
    // This ensures full fulfillment (stock, wallet, emails) whether webhook or callback runs first
    if (type === 'shop' && order_id) {
      const result = await fulfillShopOrder(
        supabase,
        reference,
        order_id,
        true, // skipPaystackVerify - webhook signature already verified
        amount / 100 // paystackAmount in Naira
      )

      if (result.alreadyProcessed) {
        console.log('[webhook] Shop order already fulfilled:', { order_id, reference })
      } else if (result.success) {
        console.log('[webhook] Shop order fulfilled:', { reference, order_id, amount })
      } else {
        console.error('[webhook] Shop fulfillment failed:', { order_id, reference, error: result.error })
      }

      return NextResponse.json({ received: true })
    }

    // Handle rental payments (subscription-based)
    // Create wallet entry here - the verify route handles everything else
    if (type === 'rental' && subscription_id) {
      const result = await fulfillRentalFromWebhook(
        supabase,
        subscription_id,
        reference,
        amount / 100 // Convert kobo to Naira
      )

      if (result.walletError) {
        console.error('[webhook] Rental wallet entry failed:', {
          subscription_id,
          reference,
          error: result.walletError,
        })
      } else if (result.alreadyProcessed) {
        console.log('[webhook] Rental already processed:', { subscription_id, reference })
      } else if (result.success) {
        console.log('[webhook] Rental wallet entry created:', { subscription_id, reference, amount })
      }

      return NextResponse.json({ received: true })
    }

    // Handle legacy rental payments with order_id
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

    // Credits require user_id
    if (!user_id) {
      console.error('[webhook] Missing user_id for credits:', { reference, metadata })
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
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
