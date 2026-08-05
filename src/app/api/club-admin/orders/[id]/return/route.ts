import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CLUB_ADMIN_ROLES = ['partner', 'admin', 'super_admin']

async function verifyClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (!profile || !CLUB_ADMIN_ROLES.includes(profile.role)) return null
  return user
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { id: orderId } = await params

  const user = await verifyClubAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get current subscription state
    const { data: subscription, error: fetchError } = await supabase
      .from('rental_subscriptions')
      .select('id, status, delivered_at, returned_at')
      .eq('id', orderId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as {
      id: string
      status: string
      delivered_at: string | null
      returned_at: string | null
    }

    // Idempotent: already returned
    if (sub.returned_at) {
      return NextResponse.json({ success: true, message: 'Already returned' })
    }

    // Must be delivered first
    if (!sub.delivered_at) {
      return NextResponse.json({ error: 'Must deliver before marking as returned' }, { status: 400 })
    }

    // Must be active or awaiting_return
    if (sub.status !== 'active' && sub.status !== 'awaiting_return') {
      return NextResponse.json({ error: 'Can only return active or awaiting_return subscriptions' }, { status: 400 })
    }

    // Get all subscription books that haven't been returned yet
    const { data: subBooks, error: booksError } = await supabase
      .from('rental_subscription_books')
      .select('id, book_id, returned')
      .eq('subscription_id', orderId)
      .eq('returned', false)

    if (booksError) {
      return NextResponse.json({ error: booksError.message }, { status: 500 })
    }

    const books = (subBooks || []) as Array<{ id: string; book_id: string; returned: boolean }>

    // Use admin client for atomic updates (bypass RLS)
    const now = new Date().toISOString()

    // Mark all subscription books as returned
    if (books.length > 0) {
      const { error: updateBooksError } = await adminSupabase
        .from('rental_subscription_books')
        .update({ returned: true, returned_at: now } as never)
        .eq('subscription_id', orderId)
        .eq('returned', false)

      if (updateBooksError) {
        return NextResponse.json({ error: updateBooksError.message }, { status: 500 })
      }

      // Increment available_copies for each book
      for (const book of books) {
        const { data: currentBook } = await adminSupabase
          .from('books')
          .select('available_copies')
          .eq('id', book.book_id)
          .single()

        if (currentBook) {
          const bookData = currentBook as { available_copies: number }
          await adminSupabase
            .from('books')
            .update({ available_copies: (bookData.available_copies || 0) + 1 } as never)
            .eq('id', book.book_id)
        }
      }
    }

    // Update subscription status to completed
    const { error: updateError } = await adminSupabase
      .from('rental_subscriptions')
      .update({
        returned_at: now,
        status: 'completed'
      } as never)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, booksReturned: books.length })
  } catch (error) {
    console.error('Return error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
