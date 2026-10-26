import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  ShopProduct,
  ShopProductOption,
  ShopProductOptionValue,
  ShopProductVariant,
  ShopProductOptionWithValues,
  ShopProductWithVariants,
} from '@/types/database'

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

      const productWithVariants: ShopProductWithVariants = {
        ...product,
        options: optionsWithValues,
        variants,
      }

      return NextResponse.json(productWithVariants)
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('[shop/products/slug] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
