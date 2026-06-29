import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyWithPaystack, grantRentalPurchase } from '@/lib/payment-fulfillment'

/**
 * Rental payment verification endpoint.
 *
 * NOTE: This endpoint does NOT require authentication because:
 * 1. Users may lose their session during Paystack redirect
 * 2. We verify the payment directly with Paystack (source of truth)
 * 3. Fulfillment is idempotent (safe to call multiple times)
 * 4. Order ownership is validated via payment metadata from Paystack
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

    const { metadata } = paystackResponse.data
    const { user_id, order_id, type } = metadata

    // 3. Validate this is a rental payment
    if (type !== 'rental' || !order_id || !user_id) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid rental payment metadata. Please contact support.',
      }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 4. Attempt fulfillment (idempotent - safe if webhook already processed)
    const result = await grantRentalPurchase(supabase, order_id, reference, user_id)

    if (!result.success) {
      // If order not found, it might have been deleted or reference is wrong
      if (result.error === 'Order not found') {
        return NextResponse.json({
          status: 'error',
          message: 'Order not found. Please contact support.',
        }, { status: 404 })
      }
      console.error('[rental/verify] Fulfillment failed:', result.error)
      return NextResponse.json({
        status: 'error',
        message: 'Failed to process order. Please contact support.',
      }, { status: 500 })
    }

    if (result.alreadyProcessed) {
      console.log('[rental/verify] Already processed (webhook handled it):', reference)
    } else {
      console.log('[rental/verify] Fulfilled via callback:', reference)
    }

    return NextResponse.json({
      status: 'success',
      message: 'Payment verified successfully!',
      order_id: order_id,
    })
  } catch (error) {
    console.error('[rental/verify] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Verification failed. Please contact support if payment was deducted.',
    }, { status: 500 })
  }
}
