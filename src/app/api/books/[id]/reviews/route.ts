import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createBookReviewSchema, validate } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: book_id } = await params
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('book_reviews')
      .select(`
        *,
        user:users!book_reviews_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .eq('book_id', book_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: reviews, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const reviewsArray = (reviews || []) as { id: string; created_at: string; [key: string]: unknown }[]

    // Check if user has liked each review
    let reviewsWithLikes = reviewsArray
    if (user && reviewsArray.length > 0) {
      const reviewIds = reviewsArray.map(r => r.id)

      const { data: likes } = await supabase
        .from('book_review_likes')
        .select('review_id')
        .eq('user_id', user.id)
        .in('review_id', reviewIds)

      const likesArray = (likes || []) as { review_id: string }[]
      const likedReviewIds = new Set(likesArray.map(l => l.review_id))

      reviewsWithLikes = reviewsArray.map(review => ({
        ...review,
        is_liked: likedReviewIds.has(review.id),
      }))
    }

    const nextCursor = reviewsArray.length === limit
      ? reviewsArray[reviewsArray.length - 1].created_at
      : null

    return NextResponse.json({
      reviews: reviewsWithLikes,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: book_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validate(createBookReviewSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check if user already reviewed this book
    const { data: existing } = await supabase
      .from('book_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', book_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this book' }, { status: 400 })
    }

    const { data: review, error } = await supabase
      .from('book_reviews')
      .insert({
        user_id: user.id,
        book_id,
        ...validation.data,
      } as never)
      .select(`
        *,
        user:users!book_reviews_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
