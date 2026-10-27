import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ShopProduct, ShopProductVariant, ShopSale } from '@/types/database'
import { isVariantAvailable } from '@/lib/shop/availability'
import { getSalePrice, saleAppliesToProduct } from '@/lib/shop/sales'

export const revalidate = 60

// Extended product for list view with variant pricing info and sale
export type ShopProductListItem = ShopProduct & {
  min_price?: number
  max_price?: number
  total_variant_stock?: number
  sale_price?: number | null
  sale_percent?: number | null
  original_price?: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const search = searchParams.get('search')

    // Fetch live sale (use admin client to bypass RLS)
    const now = new Date().toISOString()
    const { data: saleData } = await adminClient
      .from('shop_sales')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .limit(1)
      .maybeSingle()

    const liveSale = saleData as ShopSale | null

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

    const products = (data || []) as ShopProduct[]

    // Get products with variants
    const variantProductIds = products
      .filter((p) => p.has_variants)
      .map((p) => p.id)

    // Fetch variant pricing info if any products have variants
    const variantsByProduct = new Map<
      string,
      { minPrice: number; maxPrice: number; totalStock: number }
    >()

    if (variantProductIds.length > 0) {
      const { data: variantsData } = await supabase
        .from('shop_product_variants')
        .select('product_id, price_naira, stock_quantity, is_active')
        .in('product_id', variantProductIds)
        .eq('is_active', true)

      const variants = (variantsData || []) as Pick<
        ShopProductVariant,
        'product_id' | 'price_naira' | 'stock_quantity' | 'is_active'
      >[]

      // Group by product and calculate min/max prices and total stock
      for (const v of variants) {
        const existing = variantsByProduct.get(v.product_id)
        const product = products.find((p) => p.id === v.product_id)
        // If variant has no price, it inherits from product
        const effectivePrice = v.price_naira ?? product?.price_naira ?? 0
        const stock = isVariantAvailable(v) ? v.stock_quantity : 0

        if (existing) {
          existing.minPrice = Math.min(existing.minPrice, effectivePrice)
          existing.maxPrice = Math.max(existing.maxPrice, effectivePrice)
          existing.totalStock += stock
        } else {
          variantsByProduct.set(v.product_id, {
            minPrice: effectivePrice,
            maxPrice: effectivePrice,
            totalStock: stock,
          })
        }
      }
    }

    // Enrich products with variant info and sale prices
    const enrichedProducts: ShopProductListItem[] = products.map((p) => {
      const basePrice = p.price_naira
      const priceInfo = getSalePrice(p, null, liveSale)

      if (p.has_variants) {
        const variantInfo = variantsByProduct.get(p.id)
        // For variant products, apply sale to min price
        const minPrice = variantInfo?.minPrice ?? basePrice
        const saleMinPrice = liveSale && saleAppliesToProduct(liveSale, p)
          ? Math.round(minPrice * (1 - liveSale.discount_percent / 100) / 50) * 50
          : null

        return {
          ...p,
          min_price: saleMinPrice ?? minPrice,
          max_price: variantInfo?.maxPrice ?? basePrice,
          total_variant_stock: variantInfo?.totalStock ?? 0,
          sale_price: saleMinPrice,
          sale_percent: liveSale && saleAppliesToProduct(liveSale, p) ? liveSale.discount_percent : null,
          original_price: minPrice,
        }
      }

      return {
        ...p,
        sale_price: priceInfo.isOnSale ? priceInfo.salePrice : null,
        sale_percent: priceInfo.discountPercent,
        original_price: priceInfo.originalPrice,
      }
    })

    return NextResponse.json({
      products: enrichedProducts,
      sale: liveSale ? {
        id: liveSale.id,
        name: liveSale.name,
        discount_percent: liveSale.discount_percent,
        banner_text: liveSale.banner_text,
        ends_at: liveSale.ends_at,
      } : null,
    })
  } catch (error) {
    console.error('[shop/products] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
