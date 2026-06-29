import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWithPaystack,
  grantCreditPurchase,
  EXPECTED_AMOUNTS,
} from '@/lib/payment-fulfillment'

/**
 * Credit payment verification endpoint.
 *
 * NOTE: This endpoint does NOT require authentication because:
 * 1. Users may lose their session during Paystack redirect
 * 2. We verify the payment directly with Paystack (source of truth)
 * 3. Fulfillment is idempotent (safe to call multiple times)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  // 1. Validate reference format
  if (!reference || reference.length < 5 || reference.length > 100) {
    return NextResponse.json({ error: 'Invalid reference' }, { status: 400 })
  }

  try {
    // 2. Verify payment directly with Paystack (source of truth)
    const paystackResponse = await verifyWithPaystack(reference)

    if (!paystackResponse) {
      return NextResponse.json({
        status: 'error',
        message: 'Unable to verify payment. Please contact support if payment was deducted.',
      }, { status: 502 })
    }

    if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
      return NextResponse.json({
        status: 'failed',
        message: 'Payment was not successful',
      })
    }

    const { metadata, amount } = paystackResponse.data
    const { user_id, type, page_id } = metadata

    // 3. Validate metadata from Paystack response
    if (!user_id || !type) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid payment metadata. Please contact support.',
      }, { status: 400 })
    }

    // 4. Verify amount matches expected price
    const expectedAmount = EXPECTED_AMOUNTS[type]
    if (expectedAmount && amount !== expectedAmount) {
      console.error('[verify] Amount mismatch:', { expected: expectedAmount, actual: amount, reference })
      return NextResponse.json({
        status: 'error',
        message: 'Payment amount verification failed. Please contact support.',
      }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 5. Attempt fulfillment (idempotent - safe if webhook already processed)
    const result = await grantCreditPurchase(
      supabase,
      user_id,
      type,
      reference,
      amount,
      page_id
    )

    if (!result.success) {
      console.error('[verify] Fulfillment failed:', result.error)
      return NextResponse.json({
        status: 'error',
        message: 'Failed to process payment. Please contact support.',
      }, { status: 500 })
    }

    if (result.alreadyProcessed) {
      console.log('[verify] Already processed (webhook handled it):', reference)
    } else {
      console.log('[verify] Fulfilled via callback:', reference)
    }

    return NextResponse.json({
      status: 'success',
      message: 'Payment verified successfully!',
    })
  } catch (error) {
    console.error('[verify] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Verification failed. Please contact support if payment was deducted.',
    }, { status: 500 })
  }
}
