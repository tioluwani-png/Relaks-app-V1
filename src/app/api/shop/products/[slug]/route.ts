import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ShopProduct } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('shop_products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(data as ShopProduct)
  } catch (error) {
    console.error('[shop/products/slug] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
