import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const updateSaleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  discount_percent: z.number().int().min(1).max(90).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  scope: z.enum(['all', 'types', 'products']).optional(),
  product_types: z.array(z.enum(['book', 'stationery', 'combo', 'other'])).nullable().optional(),
  product_ids: z.array(z.string().uuid()).nullable().optional(),
  banner_text: z.string().max(200).nullable().optional(),
  is_active: z.boolean().optional(),
})

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = (userData as { role: string } | null)?.role
  if (!userRole || !['admin', 'super_admin'].includes(userRole)) return null

  return user
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await checkAdminAuth()
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = updateSaleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 })
    }

    const data = validation.data
    const adminClient = await createAdminClient()

    // Get current sale
    const { data: currentSaleData } = await adminClient
      .from('shop_sales')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentSaleData) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    const currentSale = currentSaleData as { starts_at: string; ends_at: string; is_active: boolean }

    // Check for overlapping if dates or active status changed
    const newStartsAt = data.starts_at || currentSale.starts_at
    const newEndsAt = data.ends_at || currentSale.ends_at
    const newIsActive = data.is_active !== undefined ? data.is_active : currentSale.is_active

    if (newIsActive) {
      const { data: overlapping } = await adminClient
        .from('shop_sales')
        .select('id, name')
        .eq('is_active', true)
        .neq('id', id)
        .or(`and(starts_at.lt.${newEndsAt},ends_at.gt.${newStartsAt})`)

      if (overlapping && overlapping.length > 0) {
        const names = overlapping.map((s: { name: string }) => s.name).join(', ')
        return NextResponse.json({
          error: `Dates overlap with existing sale(s): ${names}. Only one sale can be live at a time.`,
        }, { status: 400 })
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updates.name = data.name
    if (data.discount_percent !== undefined) updates.discount_percent = data.discount_percent
    if (data.starts_at !== undefined) updates.starts_at = data.starts_at
    if (data.ends_at !== undefined) updates.ends_at = data.ends_at
    if (data.scope !== undefined) {
      updates.scope = data.scope
      updates.product_types = data.scope === 'types' ? data.product_types : null
      updates.product_ids = data.scope === 'products' ? data.product_ids : null
    }
    if (data.banner_text !== undefined) updates.banner_text = data.banner_text
    if (data.is_active !== undefined) updates.is_active = data.is_active

    const { data: sale, error } = await adminClient
      .from('shop_sales')
      .update(updates as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/shop/sales] Update error:', error)
      return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 })
    }

    // Revalidate shop pages
    revalidatePath('/', 'layout')

    return NextResponse.json(sale)
  } catch (error) {
    console.error('[admin/shop/sales] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await checkAdminAuth()
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = await createAdminClient()

    // Check if sale has orders
    const { count } = await adminClient
      .from('shop_orders')
      .select('id', { count: 'exact', head: true })
      .eq('sale_id', id)

    if (count && count > 0) {
      return NextResponse.json({
        error: `This sale has ${count} order(s). End the sale instead of deleting it.`,
      }, { status: 400 })
    }

    const { error } = await adminClient
      .from('shop_sales')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[admin/shop/sales] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 })
    }

    // Revalidate shop pages
    revalidatePath('/', 'layout')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/shop/sales] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
