import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
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

    // Check if already liked
    const { data: existing } = await supabase
      .from('book_review_likes')
      .select('review_id')
      .eq('user_id', user.id)
      .eq('review_id', review_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 })
    }

    // Verify review exists and belongs to this book
    const { data: reviewData } = await supabase
      .from('book_reviews')
      .select('id, like_count')
      .eq('id', review_id)
      .eq('book_id', book_id)
      .single()

    const review = reviewData as { id: string; like_count: number } | null

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Insert like and update count in parallel
    const [insertResult] = await Promise.all([
      supabase
        .from('book_review_likes')
        .insert({ user_id: user.id, review_id } as never),
      supabase
        .from('book_reviews')
        .update({ like_count: (review.like_count || 0) + 1 } as never)
        .eq('id', review_id),
    ])

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ liked: true }, { status: 201 })
  } catch (error) {
    console.error('Error liking review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const supabase = await createClient()
  const { reviewId: review_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current like count
    const { data: reviewData } = await supabase
      .from('book_reviews')
      .select('like_count')
      .eq('id', review_id)
      .single()

    const review = reviewData as { like_count: number } | null

    // Delete like and update count
    const [deleteResult] = await Promise.all([
      supabase
        .from('book_review_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('review_id', review_id),
      supabase
        .from('book_reviews')
        .update({ like_count: Math.max(0, (review?.like_count || 1) - 1) } as never)
        .eq('id', review_id),
    ])

    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ liked: false })
  } catch (error) {
    console.error('Error unliking review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
