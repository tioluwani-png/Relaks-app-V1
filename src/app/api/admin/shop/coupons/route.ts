import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ShopCoupon } from '@/types/database'

// GET - List all coupons (admin only)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { data, error } = await adminSupabase
      .from('shop_coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/coupons] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[admin/coupons] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create coupon (admin only)
const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  starts_at: z.string(),
  expires_at: z.string(),
  max_uses: z.number().int().positive().nullable().optional(),
  min_order_amount: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().default(true),
  internal_note: z.string().max(500).nullable().optional(),
  allowed_during_sales: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createCouponSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Additional validation
    const { discount_type, discount_value, starts_at, expires_at } = validation.data

    if (discount_type === 'percentage' && discount_value > 100) {
      return NextResponse.json(
        { error: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      )
    }

    if (new Date(expires_at) <= new Date(starts_at)) {
      return NextResponse.json(
        { error: 'Expiry date must be after start date' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    const { data, error } = await adminSupabase
      .from('shop_coupons')
      .insert({
        ...validation.data,
        max_uses: validation.data.max_uses ?? null,
        min_order_amount: validation.data.min_order_amount ?? null,
        internal_note: validation.data.internal_note ?? null,
      } as never)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A coupon with this code already exists' },
          { status: 400 }
        )
      }
      console.error('[admin/coupons] Create error:', error)
      return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/coupons] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
