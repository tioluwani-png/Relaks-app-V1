import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ShopProduct, ShopProductVariant } from '@/types/database'

/**
 * POST /api/shop/products/validate
 * Validates product IDs and variant IDs from stored cart - returns only active, in-stock products/variants
 * with current prices (never trust stored prices)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, variantIds } = body as {
      productIds: string[]
      variantIds?: string[]
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ products: [], variants: [] })
    }

    // Limit to prevent abuse
    if (productIds.length > 50 || (variantIds && variantIds.length > 100)) {
      return NextResponse.json(
        { error: 'Too many IDs' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch only active products
    // For products with variants, we don't check stock_quantity (variants hold stock)
    const { data: products, error } = await supabase
      .from('shop_products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)

    if (error) {
      console.error('Validate products error:', error)
      return NextResponse.json(
        { error: 'Failed to validate products' },
        { status: 500 }
      )
    }

    // Cast to ShopProduct type (has_variants field added after initial type gen)
    const typedProducts = (products || []) as unknown as ShopProduct[]

    // Filter out non-variant products with no stock
    const validProducts = typedProducts.filter(
      (p) => p.has_variants || p.stock_quantity > 0
    )

    // Fetch variants if requested
    let variants: ShopProductVariant[] = []
    if (variantIds && variantIds.length > 0) {
      const { data: variantData, error: variantError } = await supabase
        .from('shop_product_variants')
        .select('*')
        .in('id', variantIds)
        .eq('is_active', true)
        .gt('stock_quantity', 0)

      if (variantError) {
        console.error('Validate variants error:', variantError)
      } else {
        variants = (variantData || []) as ShopProductVariant[]
      }
    }

    return NextResponse.json({
      products: validProducts,
      variants,
    })
  } catch (error) {
    console.error('Validate products error:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
