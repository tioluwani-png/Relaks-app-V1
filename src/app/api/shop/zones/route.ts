import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ShopDeliveryZone, ShopDeliveryArea } from '@/types/database'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch active, non-archived zones
    const { data: zones, error: zonesError } = await supabase
      .from('shop_delivery_zones')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('sort_order')

    if (zonesError) {
      console.error('[shop/zones] Zones error:', zonesError)
      return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
    }

    // Fetch areas with their zones
    const { data: areas, error: areasError } = await supabase
      .from('shop_delivery_areas')
      .select('*, zone:shop_delivery_zones(*)')
      .order('name')

    if (areasError) {
      console.error('[shop/zones] Areas error:', areasError)
      return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
    }

    // Filter areas to only include those in active, non-archived zones
    const activeZoneIds = new Set((zones as ShopDeliveryZone[]).map(z => z.id))
    const activeAreas = (areas as ShopDeliveryArea[]).filter(
      a => a.zone_id && activeZoneIds.has(a.zone_id)
    )

    return NextResponse.json({
      zones: zones as ShopDeliveryZone[],
      areas: activeAreas,
    })
  } catch (error) {
    console.error('[shop/zones] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
