import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ShopDeliveryZone } from '@/types/database'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('shop_delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('fee_naira')

    if (error) {
      console.error('[shop/zones] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
    }

    return NextResponse.json(data as ShopDeliveryZone[])
  } catch (error) {
    console.error('[shop/zones] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
