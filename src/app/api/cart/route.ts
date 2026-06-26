import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch user's cart items
export async function GET() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cart items with book data
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        user_id,
        book_id,
        created_at,
        book:books(
          id,
          title,
          author,
          cover_url,
          description
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Cast to proper type since cart_items is a new table
    type CartItemRow = {
      id: string
      user_id: string
      book_id: string
      created_at: string
      book: {
        id: string
        title: string
        author: string
        cover_url: string | null
        description: string | null
      } | null
    }

    // Transform to CartItemWithBook format
    const items = ((cartItems || []) as CartItemRow[]).map(item => ({
      id: item.id,
      user_id: item.user_id,
      book_id: item.book_id,
      created_at: item.created_at,
      book: item.book,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add book to cart
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { book_id } = body

    if (!book_id) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    // Check if book exists and is active
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, title, author, cover_url, description')
      .eq('id', book_id)
      .eq('is_active', true)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Check if already in cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', book_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Book already in cart' }, { status: 400 })
    }

    // Add to cart
    const { data: cartItem, error: insertError } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        book_id,
      } as never)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Cast to proper type
    const cartItemTyped = cartItem as { id: string; user_id: string; book_id: string; created_at: string }

    // Return with book data
    const item = {
      ...cartItemTyped,
      book,
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error adding to cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
