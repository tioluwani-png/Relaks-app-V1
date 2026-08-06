import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ShopProduct } from '@/types/database'

/**
 * POST /api/shop/products/validate
 * Validates product IDs from stored cart - returns only active, in-stock products
 * with current prices (never trust stored prices)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds } = body as { productIds: string[] }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ products: [] })
    }

    // Limit to prevent abuse
    if (productIds.length > 50) {
      return NextResponse.json(
        { error: 'Too many product IDs' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch only active products with stock > 0
    const { data: products, error } = await supabase
      .from('shop_products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)
      .gt('stock_quantity', 0)

    if (error) {
      console.error('Validate products error:', error)
      return NextResponse.json(
        { error: 'Failed to validate products' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      products: (products || []) as ShopProduct[],
    })
  } catch (error) {
    console.error('Validate products error:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
