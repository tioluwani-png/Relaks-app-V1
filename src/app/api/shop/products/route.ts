import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ShopProduct } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const search = searchParams.get('search')

    let query = supabase
      .from('shop_products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at', { ascending: false })

    if (type && type !== 'all') {
      query = query.eq('product_type', type)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[shop/products] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json(data as ShopProduct[])
  } catch (error) {
    console.error('[shop/products] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
