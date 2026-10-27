import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getItemStock } from '@/lib/shop/availability'
import { z } from 'zod'
import { generateOrderNumber, calculateCouponDiscount } from '@/lib/shop/config'
import type { ShopProduct, ShopDeliveryZone, ShopDeliveryArea, ShopCoupon, ShopProductVariant } from '@/types/database'

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
})

// Helper to generate variant label from option_values
function generateVariantLabel(optionValues: Record<string, string> | null): string | null {
  if (!optionValues || Object.keys(optionValues).length === 0) return null
  return Object.values(optionValues).join(' / ')
}

const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  customerName: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  deliveryLga: z.string().min(1).max(100),
  deliveryAddress: z.string().min(5).max(500),
  couponCode: z.string().max(50).optional().transform((s) => s?.toUpperCase().trim()),
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

    const { items, customerName, email, phone, deliveryLga, deliveryAddress, couponCode } = validation.data

    // Use admin client for writes
    const adminSupabase = await createAdminClient()

    // 1. Validate products exist, are active, and get server prices
    const productIds = [...new Set(items.map((i) => i.productId))]
    const variantIds = items
      .filter((i) => i.variantId)
      .map((i) => i.variantId as string)

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

    // Fetch variants if any
    const variantMap = new Map<string, ShopProductVariant>()
    if (variantIds.length > 0) {
      const { data: variants, error: variantsError } = await adminSupabase
        .from('shop_product_variants')
        .select('*')
        .in('id', variantIds)
        .eq('is_active', true)

      if (variantsError) {
        console.error('[shop/orders/create] Variants query error:', variantsError)
        return NextResponse.json({ error: 'Failed to validate variants' }, { status: 500 })
      }

      for (const v of (variants || []) as ShopProductVariant[]) {
        variantMap.set(v.id, v)
      }
    }

    // Check all products and variants exist and have sufficient stock
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Product not found or unavailable: ${item.productId}` },
          { status: 400 }
        )
      }

      // If product has variants, a variant must be selected
      if (product.has_variants && !item.variantId) {
        return NextResponse.json(
          { error: `Please select options for "${product.name}"` },
          { status: 400 }
        )
      }

      // If variant is specified, validate it
      if (item.variantId) {
        const variant = variantMap.get(item.variantId)
        if (!variant) {
          return NextResponse.json(
            { error: `Variant not found or unavailable for "${product.name}"` },
            { status: 400 }
          )
        }
        if (variant.product_id !== item.productId) {
          return NextResponse.json(
            { error: `Invalid variant for product "${product.name}"` },
            { status: 400 }
          )
        }
        const variantStock = getItemStock(product, variant)
        if (variantStock < item.quantity) {
          const label = generateVariantLabel(variant.option_values)
          return NextResponse.json(
            {
              error: `Not enough stock for "${product.name}${label ? ` (${label})` : ''}". Available: ${variantStock}`,
              product: product.name,
              available: variantStock,
            },
            { status: 400 }
          )
        }
      } else {
        // Non-variant product - check product stock
        const productStock = getItemStock(product, null)
        if (productStock < item.quantity) {
          return NextResponse.json(
            {
              error: `Not enough stock for "${product.name}". Available: ${productStock}`,
              product: product.name,
              available: productStock,
            },
            { status: 400 }
          )
        }
      }
    }

    // 2. Find delivery area and zone
    const { data: areaData, error: areaError } = await adminSupabase
      .from('shop_delivery_areas')
      .select('*, zone:shop_delivery_zones(*)')
      .eq('name', deliveryLga)
      .single()

    if (areaError || !areaData) {
      console.error('[shop/orders/create] Area query error:', areaError)
      return NextResponse.json(
        { error: `Delivery not available for ${deliveryLga}. We currently only deliver within Lagos.` },
        { status: 400 }
      )
    }

    const area = areaData as unknown as ShopDeliveryArea & { zone: ShopDeliveryZone | null }

    if (!area.zone || !area.zone.is_active || area.zone.is_archived) {
      return NextResponse.json(
        { error: `Delivery not available for ${deliveryLga}. Please contact us on WhatsApp.` },
        { status: 400 }
      )
    }

    const zone = area.zone

    // 3. Calculate totals server-side (never trust client)
    let subtotal = 0
    const orderItems: {
      productId: string
      productName: string
      unitPrice: number
      quantity: number
      variantId: string | null
      variantLabel: string | null
    }[] = []

    for (const item of items) {
      const product = productMap.get(item.productId)!
      const variant = item.variantId ? variantMap.get(item.variantId) : null

      // Use variant price if specified, otherwise product price
      const unitPrice = variant?.price_naira ?? product.price_naira
      const lineTotal = unitPrice * item.quantity
      subtotal += lineTotal

      orderItems.push({
        productId: item.productId,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        variantId: item.variantId ?? null,
        variantLabel: variant ? generateVariantLabel(variant.option_values) : null,
      })
    }

    const deliveryFee = zone.fee_naira

    // 4. Validate and apply coupon if provided (server-side - never trust client)
    let couponId: string | null = null
    let appliedCouponCode: string | null = null
    let discount = 0

    if (couponCode) {
      const { data: couponData } = await adminSupabase
        .from('shop_coupons')
        .select('*')
        .eq('code', couponCode)
        .single()

      if (couponData) {
        const coupon = couponData as ShopCoupon
        const now = new Date()
        const startsAt = new Date(coupon.starts_at)
        const expiresAt = new Date(coupon.expires_at)

        // Re-validate coupon server-side (never trust client)
        const isValid =
          coupon.is_active &&
          now >= startsAt &&
          now < expiresAt &&
          (coupon.max_uses === null || coupon.times_used < coupon.max_uses) &&
          (coupon.min_order_amount === null || subtotal >= coupon.min_order_amount)

        if (isValid) {
          couponId = coupon.id
          appliedCouponCode = coupon.code
          discount = calculateCouponDiscount(coupon.discount_type, coupon.discount_value, subtotal)
        }
        // If not valid, silently ignore - don't block order creation
        // The client may have an outdated coupon state
      }
    }

    const total = subtotal - discount + deliveryFee

    // 5. Create order
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
        coupon_id: couponId,
        coupon_code: appliedCouponCode,
        discount_naira: discount,
        total_naira: total,
        status: 'pending_payment',
        estimated_min_days: zone.min_days,
        estimated_max_days: zone.max_days,
      } as never)
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      console.error('[shop/orders/create] Order insert error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const orderId = (order as { id: string; order_number: string }).id

    // 6. Create order items
    const itemsToInsert = orderItems.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      unit_price_naira: item.unitPrice,
      quantity: item.quantity,
      variant_id: item.variantId,
      variant_label: item.variantLabel,
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
      discount,
      couponCode: appliedCouponCode,
      deliveryFee,
      total,
    })
  } catch (error) {
    console.error('[shop/orders/create] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
