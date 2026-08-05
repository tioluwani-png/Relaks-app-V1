import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch subscriptions with plan, books, and ratings
    const { data: subscriptions, error } = await supabase
      .from('rental_subscriptions')
      .select(`
        id,
        status,
        created_at,
        started_at,
        expires_at,
        delivery_lga,
        delivery_address,
        delivery_phone,
        picked_up_at,
        in_transit_at,
        delivered_at,
        returned_at,
        auto_renew,
        plan:rental_plans(
          id,
          name,
          books_per_cycle,
          duration_days,
          price_naira,
          swap_frequency
        ),
        books:rental_subscription_books(
          id,
          book_id,
          returned,
          book:books(
            id,
            title,
            author,
            cover_url
          )
        ),
        ratings:rental_book_ratings(
          book_id,
          rating,
          review
        )
      `)
      .eq('user_id', user.id)
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[rental/subscriptions] Error:', error)
      return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 })
    }

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('[rental/subscriptions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
