import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const supabase = await createClient()
  const { id: book_id, commentId: comment_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('book_comment_likes')
      .select('comment_id')
      .eq('user_id', user.id)
      .eq('comment_id', comment_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 })
    }

    // Verify comment exists and belongs to this book
    const { data: comment } = await supabase
      .from('book_comments')
      .select('id, like_count')
      .eq('id', comment_id)
      .eq('book_id', book_id)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Insert like and update count in parallel
    const [insertResult] = await Promise.all([
      supabase
        .from('book_comment_likes')
        .insert({ user_id: user.id, comment_id } as never),
      supabase
        .from('book_comments')
        .update({ like_count: (comment.like_count || 0) + 1 } as never)
        .eq('id', comment_id),
    ])

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ liked: true }, { status: 201 })
  } catch (error) {
    console.error('Error liking comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const supabase = await createClient()
  const { commentId: comment_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current like count
    const { data: comment } = await supabase
      .from('book_comments')
      .select('like_count')
      .eq('id', comment_id)
      .single()

    // Delete like and update count
    const [deleteResult] = await Promise.all([
      supabase
        .from('book_comment_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('comment_id', comment_id),
      supabase
        .from('book_comments')
        .update({ like_count: Math.max(0, (comment?.like_count || 1) - 1) } as never)
        .eq('id', comment_id),
    ])

    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ liked: false })
  } catch (error) {
    console.error('Error unliking comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
