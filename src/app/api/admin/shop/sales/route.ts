import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ShopSale, ShopProductType } from '@/types/database'
import { revalidatePath } from 'next/cache'

const saleSchema = z.object({
  name: z.string().min(1).max(100),
  discount_percent: z.number().int().min(1).max(90),
  starts_at: z.string(),
  ends_at: z.string(),
  scope: z.enum(['all', 'types', 'products']),
  product_types: z.array(z.enum(['book', 'stationery', 'combo', 'other'])).nullable().optional(),
  product_ids: z.array(z.string().uuid()).nullable().optional(),
  banner_text: z.string().max(200).nullable().optional(),
  is_active: z.boolean(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (userData as { role: string } | null)?.role
    if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = await createAdminClient()

    // Get all sales with order stats
    const { data: sales, error } = await adminClient
      .from('shop_sales')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/shop/sales] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
    }

    // Get order stats for each sale
    const salesWithStats = await Promise.all(
      (sales as ShopSale[]).map(async (sale) => {
        const { data: orderStats } = await adminClient
          .from('shop_orders')
          .select('id, total_naira')
          .eq('sale_id', sale.id)
          .neq('status', 'pending_payment')
          .neq('status', 'cancelled')

        const orderCount = orderStats?.length || 0
        const revenue = orderStats?.reduce((sum, o) => sum + (o as { total_naira: number }).total_naira, 0) || 0

        return { ...sale, order_count: orderCount, revenue }
      })
    )

    return NextResponse.json(salesWithStats)
  } catch (error) {
    console.error('[admin/shop/sales] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (userData as { role: string } | null)?.role
    if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = saleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 })
    }

    const data = validation.data
    const adminClient = await createAdminClient()

    // Check for overlapping active sales
    if (data.is_active) {
      const { data: overlapping } = await adminClient
        .from('shop_sales')
        .select('id, name')
        .eq('is_active', true)
        .or(`and(starts_at.lt.${data.ends_at},ends_at.gt.${data.starts_at})`)

      if (overlapping && overlapping.length > 0) {
        const names = overlapping.map((s: { name: string }) => s.name).join(', ')
        return NextResponse.json({
          error: `Dates overlap with existing sale(s): ${names}. Only one sale can be live at a time.`,
        }, { status: 400 })
      }
    }

    const { data: sale, error } = await adminClient
      .from('shop_sales')
      .insert({
        name: data.name,
        discount_percent: data.discount_percent,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        scope: data.scope,
        product_types: data.scope === 'types' ? data.product_types : null,
        product_ids: data.scope === 'products' ? data.product_ids : null,
        banner_text: data.banner_text || null,
        is_active: data.is_active,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('[admin/shop/sales] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 })
    }

    // Revalidate shop pages
    revalidatePath('/', 'layout')

    return NextResponse.json(sale)
  } catch (error) {
    console.error('[admin/shop/sales] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
