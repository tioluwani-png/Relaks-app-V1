import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateZoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fee_naira: z.number().int().min(0).optional(),
  min_days: z.number().int().min(0).max(30).optional(),
  max_days: z.number().int().min(0).max(30).optional(),
  is_active: z.boolean().optional(),
})

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile && ['admin', 'super_admin'].includes((profile as { role: string }).role)
}

/**
 * PATCH /api/admin/shop/zones/[id]
 * Update a zone
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateZoneSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Validate min_days <= max_days if both provided
    if (data.min_days !== undefined && data.max_days !== undefined) {
      if (data.min_days > data.max_days) {
        return NextResponse.json(
          { error: 'Min days cannot be greater than max days' },
          { status: 400 }
        )
      }
    }

    const adminSupabase = await createAdminClient()

    // If only one of min/max is provided, fetch the other to validate
    if ((data.min_days !== undefined) !== (data.max_days !== undefined)) {
      const { data: existing } = await adminSupabase
        .from('shop_delivery_zones')
        .select('min_days, max_days')
        .eq('id', id)
        .single()

      if (existing) {
        const minDays = data.min_days ?? (existing as { min_days: number }).min_days
        const maxDays = data.max_days ?? (existing as { max_days: number }).max_days
        if (minDays > maxDays) {
          return NextResponse.json(
            { error: 'Min days cannot be greater than max days' },
            { status: 400 }
          )
        }
      }
    }

    const { data: updated, error } = await adminSupabase
      .from('shop_delivery_zones')
      .update(data as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/shop/zones] Update error:', error)
      return NextResponse.json({ error: `Failed to update zone: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ zone: updated })
  } catch (error) {
    console.error('[admin/shop/zones] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/shop/zones/[id]
 * Delete or archive a zone (archive if it has orders)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = await createAdminClient()

    // Check if zone has any orders
    const { count } = await adminSupabase
      .from('shop_orders')
      .select('id', { count: 'exact', head: true })
      .eq('delivery_zone_id', id)

    const hasOrders = (count ?? 0) > 0

    // Move areas to unassigned
    await adminSupabase
      .from('shop_delivery_areas')
      .update({ zone_id: null } as never)
      .eq('zone_id', id)

    if (hasOrders) {
      // Archive instead of delete
      const { error } = await adminSupabase
        .from('shop_delivery_zones')
        .update({ is_archived: true, is_active: false } as never)
        .eq('id', id)

      if (error) {
        console.error('[admin/shop/zones] Archive error:', error)
        return NextResponse.json({ error: `Failed to archive zone: ${error.message}` }, { status: 500 })
      }

      return NextResponse.json({ archived: true, message: 'Zone archived (has past orders)' })
    } else {
      // Hard delete
      const { error } = await adminSupabase
        .from('shop_delivery_zones')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[admin/shop/zones] Delete error:', error)
        return NextResponse.json({ error: `Failed to delete zone: ${error.message}` }, { status: 500 })
      }

      return NextResponse.json({ deleted: true })
    }
  } catch (error) {
    console.error('[admin/shop/zones] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
