import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch user's orders (historical cart-based orders)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const cursor = searchParams.get('cursor')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('rental_orders')
      .select(`
        *,
        items:rental_order_items(
          id,
          book_id,
          price,
          rental_start_date,
          rental_end_date,
          book:books(id, title, author, cover_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: orders, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Cast to proper type since rental_orders is a new table
    const ordersTyped = (orders || []) as Array<{ created_at: string; [key: string]: unknown }>

    const nextCursor = ordersTyped.length === limit
      ? ordersTyped[ordersTyped.length - 1].created_at
      : null

    return NextResponse.json({ orders: ordersTyped, nextCursor })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
