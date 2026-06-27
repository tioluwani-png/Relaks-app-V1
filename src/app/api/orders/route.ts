import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { BOOK_RENTAL_PRICE, LAGOS_DELIVERY_FEE } from '@/lib/pricing'

// GET - Fetch user's orders
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

// POST - Create new order from cart
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { delivery } = body

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery details are required' }, { status: 400 })
    }

    // Validate required delivery fields
    const requiredFields = ['full_name', 'phone', 'email', 'address', 'city', 'state']
    for (const field of requiredFields) {
      if (!delivery[field]?.trim()) {
        return NextResponse.json({ error: `${field.replace('_', ' ')} is required` }, { status: 400 })
      }
    }

    // Get user's cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('book_id')
      .eq('user_id', user.id)

    if (cartError) {
      return NextResponse.json({ error: cartError.message }, { status: 500 })
    }

    const cartItemsArray = (cartItems || []) as { book_id: string }[]

    if (cartItemsArray.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Calculate totals
    const subtotal = cartItemsArray.length * BOOK_RENTAL_PRICE
    const deliveryFee = LAGOS_DELIVERY_FEE
    const total = subtotal + deliveryFee

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('rental_orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        subtotal,
        delivery_fee: deliveryFee,
        total,
        full_name: delivery.full_name.trim(),
        phone: delivery.phone.trim(),
        email: delivery.email.trim(),
        address: delivery.address.trim(),
        city: delivery.city.trim(),
        state: delivery.state.trim(),
        landmark: delivery.landmark?.trim() || null,
        delivery_notes: delivery.delivery_notes?.trim() || null,
      } as never)
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Cast to proper type
    const orderTyped = order as { id: string; [key: string]: unknown }

    // Create order items
    const orderItems = cartItemsArray.map(item => ({
      order_id: orderTyped.id,
      book_id: item.book_id,
      price: BOOK_RENTAL_PRICE,
    }))

    const { error: itemsError } = await supabase
      .from('rental_order_items')
      .insert(orderItems as never)

    if (itemsError) {
      // Clean up the order if items failed
      await supabase.from('rental_orders').delete().eq('id', orderTyped.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({ order: orderTyped }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
