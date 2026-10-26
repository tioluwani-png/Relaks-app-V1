import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ShopDeliveryZone, ShopDeliveryArea } from '@/types/database'

const createZoneSchema = z.object({
  name: z.string().min(1).max(100),
  fee_naira: z.number().int().min(0),
  min_days: z.number().int().min(0).max(30),
  max_days: z.number().int().min(0).max(30),
  is_active: z.boolean(),
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
 * GET /api/admin/shop/zones
 * Get all zones with their areas (including archived)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all zones (including archived)
    const { data: zones, error: zonesError } = await supabase
      .from('shop_delivery_zones')
      .select('*')
      .eq('is_archived', false)
      .order('sort_order')

    if (zonesError) {
      console.error('[admin/shop/zones] Zones error:', zonesError)
      return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
    }

    // Get all areas
    const { data: areas, error: areasError } = await supabase
      .from('shop_delivery_areas')
      .select('*')
      .order('name')

    if (areasError) {
      console.error('[admin/shop/zones] Areas error:', areasError)
      return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
    }

    return NextResponse.json({
      zones: zones as ShopDeliveryZone[],
      areas: areas as ShopDeliveryArea[],
    })
  } catch (error) {
    console.error('[admin/shop/zones] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/shop/zones
 * Create a new zone
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createZoneSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Validate min_days <= max_days
    if (data.min_days > data.max_days) {
      return NextResponse.json(
        { error: 'Min days cannot be greater than max days' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    // Get max sort_order
    const { data: maxSort } = await adminSupabase
      .from('shop_delivery_zones')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder = ((maxSort as { sort_order: number } | null)?.sort_order ?? -1) + 1

    const { data: newZone, error } = await adminSupabase
      .from('shop_delivery_zones')
      .insert({
        name: data.name,
        fee_naira: data.fee_naira,
        min_days: data.min_days,
        max_days: data.max_days,
        is_active: data.is_active,
        is_archived: false,
        sort_order: nextSortOrder,
        lgas: [], // Deprecated
      } as never)
      .select()
      .single()

    if (error) {
      console.error('[admin/shop/zones] Create error:', error)
      return NextResponse.json({ error: `Failed to create zone: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ zone: newZone })
  } catch (error) {
    console.error('[admin/shop/zones] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
