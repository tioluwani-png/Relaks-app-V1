import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOrderNumber } from '@/lib/shop/config'
import type { ShopProduct, ShopDeliveryZone } from '@/types/database'

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
})

const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  customerName: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  deliveryLga: z.string().min(1).max(100),
  deliveryAddress: z.string().min(5).max(500),
})

export async function POST(request: NextRequest) {
  try {
    // Get optional auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Parse request
    const body = await request.json()
    const validation = createOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { items, customerName, email, phone, deliveryLga, deliveryAddress } = validation.data

    // Use admin client for writes
    const adminSupabase = await createAdminClient()

    // 1. Validate products exist, are active, in stock, and get server prices
    const productIds = items.map((i) => i.productId)
    const { data: products, error: productsError } = await adminSupabase
      .from('shop_products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)

    if (productsError) {
      console.error('[shop/orders/create] Products query error:', productsError)
      return NextResponse.json({ error: 'Failed to validate products' }, { status: 500 })
    }

    const productMap = new Map<string, ShopProduct>()
    for (const p of (products || []) as ShopProduct[]) {
      productMap.set(p.id, p)
    }

    // Check all products exist
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product not found or unavailable: ${item.productId}` },
          { status: 400 }
        )
      }
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Not enough stock for "${product.name}". Available: ${product.stock_quantity}`,
            product: product.name,
            available: product.stock_quantity,
          },
          { status: 400 }
        )
      }
    }

    // 2. Find delivery zone for LGA
    const { data: zones, error: zonesError } = await adminSupabase
      .from('shop_delivery_zones')
      .select('*')
      .eq('is_active', true)

    if (zonesError) {
      console.error('[shop/orders/create] Zones query error:', zonesError)
      return NextResponse.json({ error: 'Failed to get delivery zones' }, { status: 500 })
    }

    const zone = (zones as ShopDeliveryZone[] || []).find((z) =>
      z.lgas.includes(deliveryLga)
    )

    if (!zone) {
      return NextResponse.json(
        { error: `Delivery not available for ${deliveryLga}. We currently only deliver within Lagos.` },
        { status: 400 }
      )
    }

    // 3. Calculate totals server-side (never trust client)
    let subtotal = 0
    const orderItems: { productId: string; productName: string; unitPrice: number; quantity: number }[] = []

    for (const item of items) {
      const product = productMap.get(item.productId)!
      const lineTotal = product.price_naira * item.quantity
      subtotal += lineTotal
      orderItems.push({
        productId: item.productId,
        productName: product.name,
        unitPrice: product.price_naira,
        quantity: item.quantity,
      })
    }

    const deliveryFee = zone.fee_naira
    const total = subtotal + deliveryFee

    // 4. Create order
    const orderNumber = generateOrderNumber()

    const { data: order, error: orderError } = await adminSupabase
      .from('shop_orders')
      .insert({
        order_number: orderNumber,
        user_id: user?.id || null,
        email,
        customer_name: customerName,
        phone,
        delivery_lga: deliveryLga,
        delivery_zone_id: zone.id,
        delivery_address: deliveryAddress,
        delivery_fee_naira: deliveryFee,
        subtotal_naira: subtotal,
        total_naira: total,
        status: 'pending_payment',
      } as never)
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      console.error('[shop/orders/create] Order insert error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const orderId = (order as { id: string; order_number: string }).id

    // 5. Create order items
    const itemsToInsert = orderItems.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      unit_price_naira: item.unitPrice,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await adminSupabase
      .from('shop_order_items')
      .insert(itemsToInsert as never)

    if (itemsError) {
      console.error('[shop/orders/create] Items insert error:', itemsError)
      // Cleanup order
      await adminSupabase.from('shop_orders').delete().eq('id', orderId)
      return NextResponse.json({ error: 'Failed to save order items' }, { status: 500 })
    }

    // Return order details for payment
    return NextResponse.json({
      success: true,
      orderId,
      orderNumber: (order as { order_number: string }).order_number,
      subtotal,
      deliveryFee,
      total,
    })
  } catch (error) {
    console.error('[shop/orders/create] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
