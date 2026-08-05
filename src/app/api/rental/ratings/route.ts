import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ratingSchema = z.object({
  subscriptionId: z.string().uuid(),
  bookId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).nullable().optional(),
})

/**
 * POST /api/rental/ratings
 * Submit or update a book rating for a rental subscription
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = ratingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { subscriptionId, bookId, rating, review } = validation.data

    // Verify the subscription belongs to the user and the book is in it
    const { data: subscription, error: subError } = await supabase
      .from('rental_subscriptions')
      .select(`
        id,
        user_id,
        delivered_at,
        status,
        books:rental_subscription_books(book_id)
      `)
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as {
      id: string
      user_id: string
      delivered_at: string | null
      status: string
      books: { book_id: string }[]
    }

    // Check if book is in the subscription
    const bookIds = sub.books.map(b => b.book_id)
    if (!bookIds.includes(bookId)) {
      return NextResponse.json({ error: 'Book not in this subscription' }, { status: 400 })
    }

    // Check if delivered (must be delivered to rate)
    if (!sub.delivered_at) {
      return NextResponse.json({ error: 'Cannot rate before delivery' }, { status: 400 })
    }

    // Check if 3 days have passed since delivery
    const deliveryDate = new Date(sub.delivered_at)
    const threeDaysAfter = new Date(deliveryDate.getTime() + 3 * 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now < threeDaysAfter) {
      return NextResponse.json({ error: 'Rating available from day 3' }, { status: 400 })
    }

    // Upsert the rating (insert or update)
    const { error: ratingError } = await supabase
      .from('rental_book_ratings')
      .upsert(
        {
          user_id: user.id,
          subscription_id: subscriptionId,
          book_id: bookId,
          rating,
          review: review || null,
          updated_at: new Date().toISOString(),
        } as never,
        {
          onConflict: 'user_id,subscription_id,book_id',
        }
      )

    if (ratingError) {
      console.error('[rental/ratings] Error:', ratingError)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[rental/ratings] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/rental/ratings?subscriptionId=xxx
 * Get all ratings for a subscription
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 })
    }

    // Verify ownership
    const { data: subscription } = await supabase
      .from('rental_subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('rental_book_ratings')
      .select(`
        id,
        book_id,
        rating,
        review,
        created_at,
        book:books(id, title, author, cover_url)
      `)
      .eq('subscription_id', subscriptionId)
      .eq('user_id', user.id)

    if (ratingsError) {
      return NextResponse.json({ error: 'Failed to load ratings' }, { status: 500 })
    }

    return NextResponse.json({ ratings })
  } catch (error) {
    console.error('[rental/ratings] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
