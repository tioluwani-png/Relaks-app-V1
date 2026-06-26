import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const supabase = await createClient()
  const { id: book_id, reviewId: review_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the review exists and belongs to this user
    const { data: existingReview } = await supabase
      .from('book_reviews')
      .select('id, user_id')
      .eq('id', review_id)
      .eq('book_id', book_id)
      .single()

    const existing = existingReview as { id: string; user_id: string } | null

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own reviews' }, { status: 403 })
    }

    const body = await request.json()
    const { rating, body: reviewBody, title, is_spoiler } = body

    // Validate rating
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Validate body
    if (reviewBody !== undefined && (typeof reviewBody !== 'string' || reviewBody.trim().length < 10)) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (rating !== undefined) updateData.rating = rating
    if (reviewBody !== undefined) updateData.body = reviewBody.trim()
    if (title !== undefined) updateData.title = title?.trim() || null
    if (is_spoiler !== undefined) updateData.is_spoiler = is_spoiler

    const { data: review, error } = await supabase
      .from('book_reviews')
      .update(updateData as never)
      .eq('id', review_id)
      .select(`
        *,
        user:users!book_reviews_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const supabase = await createClient()
  const { id: book_id, reviewId: review_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the review exists and belongs to this user
    const { data: existingReview } = await supabase
      .from('book_reviews')
      .select('id, user_id')
      .eq('id', review_id)
      .eq('book_id', book_id)
      .single()

    const existing = existingReview as { id: string; user_id: string } | null

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own reviews' }, { status: 403 })
    }

    // Delete the review (this will also delete associated likes due to foreign key cascade)
    const { error } = await supabase
      .from('book_reviews')
      .delete()
      .eq('id', review_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
