import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initializePayment, toKobo } from '@/lib/paystack'
import type { ShopOrder } from '@/types/database'

const initializeSchema = z.object({
  orderId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = initializeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { orderId } = validation.data

    // Get optional auth (shop allows guest checkout)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const adminSupabase = await createAdminClient()

    // Get order
    const { data: orderData, error: orderError } = await adminSupabase
      .from('shop_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orderData as unknown as ShopOrder

    // Verify order is pending payment
    if (order.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Order is not awaiting payment' },
        { status: 400 }
      )
    }

    // If logged in, verify order belongs to user (or user_id is null for guest)
    if (user && order.user_id && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Generate reference
    const reference = `shop-${orderId}-${Date.now()}`
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shop/payment/callback`

    // Initialize with Paystack
    const result = await initializePayment(
      order.email,
      toKobo(order.total_naira),
      reference,
      {
        order_id: orderId,
        order_number: order.order_number,
        type: 'shop',
        user_id: user?.id || null,
      },
      callbackUrl
    )

    if (!result.status) {
      console.error('[shop/payments/initialize] Paystack error:', result.message)
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    })
  } catch (error) {
    console.error('[shop/payments/initialize] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
