import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ShopSale } from '@/types/database'

export const revalidate = 60

export async function GET() {
  try {
    const adminClient = await createAdminClient()
    const now = new Date().toISOString()

    // Get currently live sale
    const { data, error } = await adminClient
      .from('shop_sales')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[shop/sale] Error:', error)
      return NextResponse.json({ sale: null })
    }

    return NextResponse.json({ sale: data as ShopSale | null })
  } catch (error) {
    console.error('[shop/sale] Error:', error)
    return NextResponse.json({ sale: null })
  }
}
