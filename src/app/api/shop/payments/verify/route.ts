import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  fulfillShopOrder,
  verifyPaystackTransaction,
  extractOrderIdFromReference,
} from '@/lib/shop/fulfillment'

const verifySchema = z.object({
  reference: z.string().min(5).max(100),
  orderId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = verifySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { reference, orderId: clientOrderId } = validation.data

    // Validate reference format (must be shop payment)
    if (!reference.startsWith('shop-') && !reference.startsWith('shop_')) {
      return NextResponse.json(
        { error: 'Invalid payment reference format' },
        { status: 400 }
      )
    }

    // 1. Verify with Paystack first to get the authoritative order_id from metadata
    let paystackOrderId: string | null = null

    try {
      const paystackResponse = await verifyPaystackTransaction(reference)

      if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
        return NextResponse.json(
          { error: 'Payment not successful on Paystack' },
          { status: 400 }
        )
      }

      // Get order_id from Paystack metadata (source of truth)
      paystackOrderId = paystackResponse.data.metadata?.order_id || null
    } catch (error) {
      console.error('[shop/payments/verify] Paystack verify error:', error)
      return NextResponse.json(
        { error: 'Failed to verify payment with Paystack' },
        { status: 500 }
      )
    }

    // 2. Determine the order ID to use
    // Priority: Paystack metadata > reference extraction > client-provided
    let orderId = paystackOrderId

    if (!orderId) {
      // Fallback: extract from reference
      orderId = extractOrderIdFromReference(reference)
    }

    if (!orderId) {
      // Last resort: use client-provided (but this is risky)
      console.warn('[shop/payments/verify] Using client orderId as fallback:', clientOrderId)
      orderId = clientOrderId
    }

    // 3. Cross-check: if metadata order_id exists but doesn't match client, that's suspicious
    if (paystackOrderId && paystackOrderId !== clientOrderId) {
      console.warn(
        '[shop/payments/verify] Order ID mismatch:',
        { paystack: paystackOrderId, client: clientOrderId, reference }
      )
      // Use the Paystack one as it's authoritative
    }

    const adminSupabase = await createAdminClient()

    // 4. Run fulfillment (idempotent - handles already-processed case)
    const result = await fulfillShopOrder(
      adminSupabase,
      reference,
      orderId,
      true // skipPaystackVerify - we already verified above
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // 5. Return success (whether newly fulfilled or already processed)
    return NextResponse.json({
      success: true,
      orderNumber: result.orderNumber,
      estimatedMinDays: result.estimatedMinDays,
      estimatedMaxDays: result.estimatedMaxDays,
      stockWarnings: result.stockWarnings,
      alreadyProcessed: result.alreadyProcessed,
    })
  } catch (error) {
    console.error('[shop/payments/verify] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
