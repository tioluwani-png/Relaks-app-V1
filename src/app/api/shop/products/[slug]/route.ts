import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  ShopProduct,
  ShopProductOption,
  ShopProductOptionValue,
  ShopProductVariant,
  ShopProductOptionWithValues,
  ShopProductWithVariants,
  ShopSale,
} from '@/types/database'
import { getSalePrice, saleAppliesToProduct } from '@/lib/shop/sales'

export const revalidate = 60

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const adminClient = await createAdminClient()

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

    const { data, error } = await supabase
      .from('shop_products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = data as ShopProduct

    // If product has variants, fetch options and variants
    if (product.has_variants) {
      // Fetch options with values
      const { data: optionsData } = await supabase
        .from('shop_product_options')
        .select('*')
        .eq('product_id', product.id)
        .order('sort_order', { ascending: true })

      const options = (optionsData || []) as ShopProductOption[]

      // Fetch option values for each option
      const optionIds = options.map((o) => o.id)
      let optionValues: ShopProductOptionValue[] = []
      if (optionIds.length > 0) {
        const { data: valuesData } = await supabase
          .from('shop_product_option_values')
          .select('*')
          .in('option_id', optionIds)
          .order('sort_order', { ascending: true })

        optionValues = (valuesData || []) as ShopProductOptionValue[]
      }

      // Group values by option
      const optionsWithValues: ShopProductOptionWithValues[] = options.map((opt) => ({
        ...opt,
        values: optionValues.filter((v) => v.option_id === opt.id),
      }))

      // Fetch active variants with stock
      const { data: variantsData } = await supabase
        .from('shop_product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      const variants = (variantsData || []) as ShopProductVariant[]

      // Apply sale prices to variants
      const variantsWithSale = variants.map((v) => {
        const priceInfo = getSalePrice(product, v, liveSale)
        return {
          ...v,
          sale_price: priceInfo.isOnSale ? priceInfo.salePrice : null,
          original_price: priceInfo.isOnSale ? v.price_naira ?? product.price_naira : null,
        }
      })

      const productWithVariants = {
        ...product,
        options: optionsWithValues,
        variants: variantsWithSale,
      }

      // Add sale info to product
      const priceInfo = getSalePrice(product, null, liveSale)
      return NextResponse.json({
        ...productWithVariants,
        sale_price: priceInfo.isOnSale ? priceInfo.salePrice : null,
        sale_percent: priceInfo.discountPercent,
        original_price: priceInfo.isOnSale ? priceInfo.originalPrice : null,
        sale: liveSale && saleAppliesToProduct(liveSale, product) ? {
          id: liveSale.id,
          name: liveSale.name,
          discount_percent: liveSale.discount_percent,
          banner_text: liveSale.banner_text,
          ends_at: liveSale.ends_at,
        } : null,
      })
    }

    // Non-variant product
    const priceInfo = getSalePrice(product, null, liveSale)
    return NextResponse.json({
      ...product,
      sale_price: priceInfo.isOnSale ? priceInfo.salePrice : null,
      sale_percent: priceInfo.discountPercent,
      original_price: priceInfo.isOnSale ? priceInfo.originalPrice : null,
      sale: liveSale && saleAppliesToProduct(liveSale, product) ? {
        id: liveSale.id,
        name: liveSale.name,
        discount_percent: liveSale.discount_percent,
        banner_text: liveSale.banner_text,
        ends_at: liveSale.ends_at,
      } : null,
    })
  } catch (error) {
    console.error('[shop/products/slug] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
