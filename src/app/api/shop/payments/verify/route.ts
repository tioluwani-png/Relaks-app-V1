import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendShopOrderConfirmationEmail, sendShopNewOrderAlertEmail } from '@/lib/shop/emails'
import type { ShopOrder, ShopOrderItem, ShopProduct } from '@/types/database'

const verifySchema = z.object({
  reference: z.string().min(5).max(100),
  orderId: z.string().uuid(),
})

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    status: string
    reference: string
    amount: number // In kobo
    currency: string
    metadata?: {
      order_id?: string
      type?: string
    }
  }
}

async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Paystack verify failed: ${response.status}`)
  }

  return response.json()
}

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

    const { reference, orderId } = validation.data

    // Validate reference format (must be shop payment)
    if (!reference.startsWith('shop_')) {
      return NextResponse.json(
        { error: 'Invalid payment reference format' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    // 1. Check for duplicate reference
    const { data: existingPayment } = await adminSupabase
      .from('shop_payments')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      )
    }

    // 2. Get order from DB
    const { data: orderData, error: orderError } = await adminSupabase
      .from('shop_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orderData as unknown as ShopOrder

    if (order.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Order is not awaiting payment' },
        { status: 400 }
      )
    }

    // 3. Verify with Paystack
    let paystackData: PaystackVerifyResponse['data']
    try {
      const paystackResponse = await verifyPaystackTransaction(reference)

      if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
        return NextResponse.json(
          { error: 'Payment not successful' },
          { status: 400 }
        )
      }

      paystackData = paystackResponse.data
    } catch (error) {
      console.error('[shop/payments/verify] Paystack verify error:', error)
      return NextResponse.json(
        { error: 'Failed to verify payment with Paystack' },
        { status: 500 }
      )
    }

    // 4. Verify amount matches order (Paystack returns kobo)
    const paidAmountNaira = paystackData.amount / 100
    if (paidAmountNaira !== order.total_naira) {
      console.error(
        `[shop/payments/verify] Amount mismatch: paid ${paidAmountNaira}, expected ${order.total_naira}`
      )
      return NextResponse.json(
        { error: 'Payment amount does not match order total' },
        { status: 400 }
      )
    }

    // 5. Get order items
    const { data: itemsData, error: itemsError } = await adminSupabase
      .from('shop_order_items')
      .select('*')
      .eq('order_id', orderId)

    if (itemsError || !itemsData || itemsData.length === 0) {
      console.error('[shop/payments/verify] Items query error:', itemsError)
      return NextResponse.json({ error: 'Order items not found' }, { status: 500 })
    }

    const items = itemsData as unknown as ShopOrderItem[]

    // 6. Atomically decrement stock for each item
    const stockFailures: string[] = []

    for (const item of items) {
      if (!item.product_id) continue

      // Get current stock
      const { data: productData } = await adminSupabase
        .from('shop_products')
        .select('stock_quantity, name')
        .eq('id', item.product_id)
        .single()

      if (!productData) {
        stockFailures.push(item.product_name)
        continue
      }

      const product = productData as unknown as Pick<ShopProduct, 'stock_quantity' | 'name'>

      // Optimistic lock update
      const { data: updated, error: updateError } = await adminSupabase
        .from('shop_products')
        .update({ stock_quantity: product.stock_quantity - item.quantity } as never)
        .eq('id', item.product_id)
        .gte('stock_quantity', item.quantity) // Only if enough stock
        .select('id')

      if (updateError || !updated || (Array.isArray(updated) && updated.length === 0)) {
        stockFailures.push(item.product_name)
      }
    }

    // If any stock decrements failed, we still mark as paid but alert ops
    // The order is valid, they just need to manage inventory manually

    // 7. Record payment
    const { error: paymentError } = await adminSupabase.from('shop_payments').insert({
      order_id: orderId,
      amount_naira: order.total_naira,
      paystack_reference: reference,
      paystack_status: 'success',
    } as never)

    if (paymentError) {
      console.error('[shop/payments/verify] Payment record error:', paymentError)
      // Don't fail - the payment was successful with Paystack
    }

    // 8. Update order status to paid
    const { error: statusError } = await adminSupabase
      .from('shop_orders')
      .update({ status: 'paid' } as never)
      .eq('id', orderId)

    if (statusError) {
      console.error('[shop/payments/verify] Status update error:', statusError)
    }

    // 9. Send confirmation email to customer
    try {
      await sendShopOrderConfirmationEmail(
        order.email,
        order.customer_name,
        order.order_number,
        items,
        order.subtotal_naira,
        order.delivery_fee_naira,
        order.total_naira,
        order.delivery_address,
        order.delivery_lga
      )
    } catch (emailError) {
      console.error('[shop/payments/verify] Confirmation email error:', emailError)
    }

    // 10. Send ops alert
    try {
      await sendShopNewOrderAlertEmail(
        orderId,
        order.order_number,
        order.customer_name,
        order.phone,
        order.email,
        order.delivery_address,
        order.delivery_lga,
        items,
        order.subtotal_naira,
        order.delivery_fee_naira,
        order.total_naira,
        reference,
        stockFailures.length > 0 ? stockFailures : undefined
      )
    } catch (emailError) {
      console.error('[shop/payments/verify] Ops alert error:', emailError)
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      stockWarnings: stockFailures.length > 0 ? stockFailures : undefined,
    })
  } catch (error) {
    console.error('[shop/payments/verify] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
