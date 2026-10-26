import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  fulfillShopOrder,
  verifyPaystackTransaction,
  extractOrderIdFromReference,
} from '@/lib/shop/fulfillment'
import type { ShopOrder } from '@/types/database'

/**
 * POST /api/admin/shop/orders/recover
 *
 * Recover a shop order that has a successful Paystack payment but is still 'pending_payment'.
 *
 * Body options:
 * - { reference: "shop-uuid-timestamp" } - Recover by Paystack reference (recommended)
 * - { orderId: "uuid" } - Recover by order ID (will search for matching Paystack payment)
 *
 * Requires admin or super_admin role.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const role = (user as { role: string }).role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    // 2. Parse body
    let reference: string | null = null
    let orderId: string | null = null

    try {
      const body = await request.json()
      reference = body.reference || null
      orderId = body.orderId || null
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!reference && !orderId) {
      return NextResponse.json(
        { error: 'Provide either reference or orderId' },
        { status: 400 }
      )
    }

    // 3. If reference provided, verify with Paystack and get order_id
    if (reference) {
      try {
        const psResponse = await verifyPaystackTransaction(reference)

        if (!psResponse.status || psResponse.data.status !== 'success') {
          return NextResponse.json(
            { error: 'Payment not successful on Paystack', paystackStatus: psResponse.data?.status },
            { status: 400 }
          )
        }

        // Get order_id from metadata or extract from reference
        orderId = psResponse.data.metadata?.order_id || extractOrderIdFromReference(reference)

        if (!orderId) {
          return NextResponse.json(
            { error: 'Could not determine order ID from reference or metadata' },
            { status: 400 }
          )
        }

        // Run fulfillment
        const result = await fulfillShopOrder(
          adminSupabase,
          reference,
          orderId,
          true, // skipPaystackVerify - already verified
          psResponse.data.amount / 100
        )

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: result.alreadyProcessed
              ? 'Order was already fulfilled'
              : 'Order recovered successfully',
            orderNumber: result.orderNumber,
            orderId,
            alreadyProcessed: result.alreadyProcessed,
          })
        } else {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
      } catch (error) {
        console.error('[recover] Paystack verify error:', error)
        return NextResponse.json(
          { error: 'Failed to verify reference with Paystack' },
          { status: 500 }
        )
      }
    }

    // 4. If only orderId provided, check if there's an existing payment record
    if (orderId) {
      // Check order exists and is pending
      const { data: orderData, error: orderError } = await adminSupabase
        .from('shop_orders')
        .select('id, order_number, status, total_naira')
        .eq('id', orderId)
        .single()

      if (orderError || !orderData) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const order = orderData as unknown as Pick<ShopOrder, 'id' | 'order_number' | 'status' | 'total_naira'>

      if (order.status !== 'pending_payment') {
        return NextResponse.json({
          success: true,
          message: 'Order is already processed',
          orderNumber: order.order_number,
          status: order.status,
          alreadyProcessed: true,
        })
      }

      // Check if there's a payment record (partial fulfillment case)
      const { data: existingPayment } = await adminSupabase
        .from('shop_payments')
        .select('paystack_reference')
        .eq('order_id', orderId)
        .single()

      if (existingPayment) {
        // Payment record exists, run fulfillment with that reference
        const ref = (existingPayment as { paystack_reference: string }).paystack_reference
        const result = await fulfillShopOrder(
          adminSupabase,
          ref,
          orderId,
          true,
          order.total_naira
        )

        return NextResponse.json({
          success: result.success,
          message: result.success
            ? (result.alreadyProcessed ? 'Order was already fulfilled' : 'Order recovered')
            : result.error,
          orderNumber: result.orderNumber,
          orderId,
        })
      }

      // No payment record - user needs to provide the Paystack reference
      return NextResponse.json({
        error: 'No payment record found for this order. Please provide the Paystack reference.',
        orderNumber: order.order_number,
        hint: 'Get the reference from Paystack dashboard and call again with { "reference": "shop-..." }',
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('[recover] Error:', error)
    return NextResponse.json({ error: 'Recovery failed' }, { status: 500 })
  }
}

/**
 * GET /api/admin/shop/orders/recover
 *
 * List pending_payment orders that might need recovery.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const role = (user as { role: string }).role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    // Find pending_payment orders from last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: pendingOrders, error } = await adminSupabase
      .from('shop_orders')
      .select('id, order_number, customer_name, email, total_naira, created_at')
      .eq('status', 'pending_payment')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to query orders' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      orders: pendingOrders || [],
      hint: 'To recover an order, POST to this endpoint with { "reference": "shop-uuid-timestamp" } from Paystack',
    })
  } catch (error) {
    console.error('[recover] GET Error:', error)
    return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 })
  }
}
