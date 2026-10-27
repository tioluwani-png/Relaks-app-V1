import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { calculateCouponDiscount, formatCouponDiscount } from '@/lib/shop/config'
import type { ShopCoupon, ShopSale } from '@/types/database'

const validateSchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.toUpperCase().trim()),
  subtotal: z.number().positive(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { valid: false, error: 'Invalid coupon code' },
        { status: 400 }
      )
    }

    const { code, subtotal } = validation.data
    const adminSupabase = await createAdminClient()

    // Check if there's a live sale
    const now = new Date()
    const nowIso = now.toISOString()
    const { data: saleData } = await adminSupabase
      .from('shop_sales')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .gt('ends_at', nowIso)
      .limit(1)
      .maybeSingle()

    const liveSale = saleData as ShopSale | null

    // Look up coupon (using admin client since RLS blocks public access)
    const { data: couponData, error } = await adminSupabase
      .from('shop_coupons')
      .select('*')
      .eq('code', code)
      .single()

    if (error || !couponData) {
      return NextResponse.json({
        valid: false,
        error: 'This code is not valid',
      })
    }

    const coupon = couponData as ShopCoupon
    const startsAt = new Date(coupon.starts_at)
    const expiresAt = new Date(coupon.expires_at)

    // Validation checks
    if (!coupon.is_active) {
      return NextResponse.json({
        valid: false,
        error: 'This code is no longer active',
      })
    }

    if (now < startsAt) {
      return NextResponse.json({
        valid: false,
        error: 'This code is not yet active',
      })
    }

    if (now >= expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'This code has expired',
      })
    }

    if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
      return NextResponse.json({
        valid: false,
        error: 'This code has reached its usage limit',
      })
    }

    if (coupon.min_order_amount !== null && subtotal < coupon.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of ₦${coupon.min_order_amount.toLocaleString()} required`,
      })
    }

    // Check if coupon is allowed during sales
    if (liveSale && !coupon.allowed_during_sales) {
      return NextResponse.json({
        valid: false,
        error: "Coupons can't be combined with the current sale",
      })
    }

    // Calculate discount
    const discount = calculateCouponDiscount(coupon.discount_type, coupon.discount_value, subtotal)
    const description = formatCouponDiscount(coupon.discount_type, coupon.discount_value)

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
      discount,
      description,
    })
  } catch (error) {
    console.error('[shop/coupons/validate] Error:', error)
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}
