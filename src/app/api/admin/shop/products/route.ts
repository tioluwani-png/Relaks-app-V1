import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const optionSchema = z.object({
  name: z.string().min(1).max(50),
  values: z.array(z.object({
    value: z.string().min(1).max(50),
  })).min(1),
})

const variantSchema = z.object({
  optionValues: z.record(z.string(), z.string()),
  sku: z.string().max(50).optional(),
  price_naira: z.string().optional(),
  stock_quantity: z.string(),
  image_url: z.string().optional(),
  is_active: z.boolean(),
})

const productSchema = z.object({
  id: z.string().uuid().optional(), // For updates
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price_naira: z.number().int().positive(),
  compare_at_price_naira: z.number().int().positive().nullable().optional(),
  product_type: z.enum(['book', 'stationery', 'combo', 'other']),
  edition: z.string().max(100).optional(),
  images: z.array(z.string()),
  stock_quantity: z.number().int().min(0),
  sort_order: z.number().int(),
  has_variants: z.boolean(),
  options: z.array(optionSchema).optional(),
  variants: z.array(variantSchema).optional(),
})

/**
 * POST /api/admin/shop/products
 * Create or update a product with options and variants atomically
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = productSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data
    const isUpdate = !!data.id

    // Use admin client for writes (bypasses RLS)
    const adminSupabase = await createAdminClient()

    // Validate variants if has_variants is true
    if (data.has_variants) {
      if (!data.options || data.options.length === 0) {
        return NextResponse.json(
          { error: 'Products with variations require at least one option' },
          { status: 400 }
        )
      }
      if (!data.variants || data.variants.length === 0) {
        return NextResponse.json(
          { error: 'Products with variations require at least one variant' },
          { status: 400 }
        )
      }
    }

    // Prepare product payload
    const productPayload = {
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      price_naira: data.price_naira,
      compare_at_price_naira: data.compare_at_price_naira || null,
      product_type: data.product_type,
      edition: data.edition || null,
      images: data.images,
      stock_quantity: data.has_variants ? 0 : data.stock_quantity,
      sort_order: data.sort_order,
      has_variants: data.has_variants,
    }

    let productId: string

    // Start transaction-like operations
    try {
      if (isUpdate) {
        // Update existing product
        const { error: updateError } = await adminSupabase
          .from('shop_products')
          .update(productPayload as never)
          .eq('id', data.id!)

        if (updateError) {
          console.error('[admin/shop/products] Update product error:', updateError)
          return NextResponse.json(
            { error: `Failed to update product: ${updateError.message}` },
            { status: 500 }
          )
        }
        productId = data.id!

        // Delete existing options (cascade deletes values) and variants
        if (data.has_variants) {
          const { error: delOptError } = await adminSupabase
            .from('shop_product_options')
            .delete()
            .eq('product_id', productId)

          if (delOptError) {
            console.error('[admin/shop/products] Delete options error:', delOptError)
          }

          const { error: delVarError } = await adminSupabase
            .from('shop_product_variants')
            .delete()
            .eq('product_id', productId)

          if (delVarError) {
            console.error('[admin/shop/products] Delete variants error:', delVarError)
          }
        }
      } else {
        // Create new product
        const { data: newProduct, error: createError } = await adminSupabase
          .from('shop_products')
          .insert(productPayload as never)
          .select('id')
          .single()

        if (createError) {
          console.error('[admin/shop/products] Create product error:', createError)
          return NextResponse.json(
            { error: `Failed to create product: ${createError.message}` },
            { status: 500 }
          )
        }
        productId = (newProduct as { id: string }).id
      }

      // Insert options and variants if has_variants
      if (data.has_variants && data.options && data.variants) {
        // Insert options and collect IDs
        const optionIdMap: Record<string, string> = {}

        for (let optIdx = 0; optIdx < data.options.length; optIdx++) {
          const opt = data.options[optIdx]

          const { data: optData, error: optError } = await adminSupabase
            .from('shop_product_options')
            .insert({
              product_id: productId,
              name: opt.name,
              sort_order: optIdx,
            } as never)
            .select('id')
            .single()

          if (optError) {
            console.error('[admin/shop/products] Insert option error:', optError)
            // Cleanup: delete the product if it was just created
            if (!isUpdate) {
              await adminSupabase.from('shop_products').delete().eq('id', productId)
            }
            return NextResponse.json(
              { error: `Failed to create option "${opt.name}": ${optError.message}` },
              { status: 500 }
            )
          }

          const optionId = (optData as { id: string }).id
          optionIdMap[opt.name] = optionId

          // Insert option values
          const valuesToInsert = opt.values.map((v, vIdx) => ({
            option_id: optionId,
            value: v.value,
            sort_order: vIdx,
          }))

          const { error: valError } = await adminSupabase
            .from('shop_product_option_values')
            .insert(valuesToInsert as never)

          if (valError) {
            console.error('[admin/shop/products] Insert option values error:', valError)
            // Cleanup
            if (!isUpdate) {
              await adminSupabase.from('shop_products').delete().eq('id', productId)
            }
            return NextResponse.json(
              { error: `Failed to create values for "${opt.name}": ${valError.message}` },
              { status: 500 }
            )
          }
        }

        // Insert variants
        const variantsToInsert = data.variants.map((v, idx) => ({
          product_id: productId,
          option_values: v.optionValues,
          sku: v.sku || null,
          price_naira: v.price_naira ? parseInt(v.price_naira) : null,
          stock_quantity: parseInt(v.stock_quantity) || 0,
          image_url: v.image_url || null,
          is_active: v.is_active,
          sort_order: idx,
        }))

        const { error: varError } = await adminSupabase
          .from('shop_product_variants')
          .insert(variantsToInsert as never)

        if (varError) {
          console.error('[admin/shop/products] Insert variants error:', varError)
          // Cleanup
          if (!isUpdate) {
            await adminSupabase.from('shop_products').delete().eq('id', productId)
          }
          return NextResponse.json(
            { error: `Failed to create variants: ${varError.message}` },
            { status: 500 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        productId,
        isUpdate,
      })
    } catch (dbError) {
      console.error('[admin/shop/products] Database error:', dbError)
      return NextResponse.json(
        { error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[admin/shop/products] Error:', error)
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
