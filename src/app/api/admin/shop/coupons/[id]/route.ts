import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Helper to check admin role
async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
    return null
  }

  return user
}

// GET - Get single coupon
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await checkAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { data, error } = await adminSupabase
      .from('shop_coupons')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
      }
      console.error('[admin/coupons] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/coupons] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update coupon
const updateCouponSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().positive().optional(),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  min_order_amount: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  internal_note: z.string().max(500).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await checkAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = updateCouponSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Validate percentage if provided
    if (validation.data.discount_type === 'percentage' && validation.data.discount_value && validation.data.discount_value > 100) {
      return NextResponse.json(
        { error: 'Percentage discount cannot exceed 100%' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    // Get current coupon if we need to validate dates
    if (validation.data.starts_at || validation.data.expires_at) {
      const { data: current } = await adminSupabase
        .from('shop_coupons')
        .select('starts_at, expires_at')
        .eq('id', id)
        .single()

      if (current) {
        const startsAt = validation.data.starts_at || (current as { starts_at: string }).starts_at
        const expiresAt = validation.data.expires_at || (current as { expires_at: string }).expires_at

        if (new Date(expiresAt) <= new Date(startsAt)) {
          return NextResponse.json(
            { error: 'Expiry date must be after start date' },
            { status: 400 }
          )
        }
      }
    }

    const { data, error } = await adminSupabase
      .from('shop_coupons')
      .update(validation.data as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A coupon with this code already exists' },
          { status: 400 }
        )
      }
      console.error('[admin/coupons] Update error:', error)
      return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/coupons] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await checkAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { error } = await adminSupabase
      .from('shop_coupons')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[admin/coupons] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/coupons] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
