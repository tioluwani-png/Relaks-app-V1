import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ShopDeliveryArea } from '@/types/database'

const createAreaSchema = z.object({
  name: z.string().min(1).max(100),
  zone_id: z.string().uuid().nullable().optional(),
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
 * GET /api/admin/shop/areas
 * Get all areas
 */
export async function GET() {
  try {
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('shop_delivery_areas')
      .select('*, zone:shop_delivery_zones(*)')
      .order('name')

    if (error) {
      console.error('[admin/shop/areas] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
    }

    return NextResponse.json({ areas: data as ShopDeliveryArea[] })
  } catch (error) {
    console.error('[admin/shop/areas] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/shop/areas
 * Create a custom area
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createAreaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, zone_id } = validation.data
    const adminSupabase = await createAdminClient()

    // Check for duplicate name
    const { data: existing } = await adminSupabase
      .from('shop_delivery_areas')
      .select('id')
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'An area with this name already exists' }, { status: 400 })
    }

    const { data: newArea, error } = await adminSupabase
      .from('shop_delivery_areas')
      .insert({
        name,
        zone_id: zone_id || null,
        is_custom: true,
      } as never)
      .select('*, zone:shop_delivery_zones(*)')
      .single()

    if (error) {
      console.error('[admin/shop/areas] Create error:', error)
      return NextResponse.json({ error: `Failed to create area: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ area: newArea })
  } catch (error) {
    console.error('[admin/shop/areas] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
