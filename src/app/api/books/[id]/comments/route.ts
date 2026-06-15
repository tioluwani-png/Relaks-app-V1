import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createBookCommentSchema, validate } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: book_id } = await params
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch top-level comments
    let query = supabase
      .from('book_comments')
      .select(`
        *,
        user:users!book_comments_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .eq('book_id', book_id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: comments, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const commentsArray = (comments || []) as { id: string; created_at: string; [key: string]: unknown }[]

    // Fetch replies for each comment
    if (commentsArray.length > 0) {
      const commentIds = commentsArray.map(c => c.id)

      const { data: replies } = await supabase
        .from('book_comments')
        .select(`
          *,
          user:users!book_comments_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
        `)
        .in('parent_id', commentIds)
        .order('created_at', { ascending: true })

      // Group replies by parent_id
      const repliesMap = new Map<string, unknown[]>()
      const repliesArray = (replies || []) as { parent_id: string; [key: string]: unknown }[]
      for (const reply of repliesArray) {
        const parentId = reply.parent_id
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, [])
        }
        repliesMap.get(parentId)!.push(reply)
      }

      // Attach replies to comments
      for (const comment of commentsArray) {
        (comment as Record<string, unknown>).replies = repliesMap.get(comment.id) || []
      }
    }

    // Check if user has liked each comment
    let commentsWithLikes = commentsArray
    if (user && commentsArray.length > 0) {
      const allCommentIds: string[] = []
      for (const comment of commentsArray) {
        allCommentIds.push(comment.id)
        const replies = (comment as Record<string, unknown>).replies as { id: string }[]
        for (const reply of replies || []) {
          allCommentIds.push(reply.id)
        }
      }

      const { data: likes } = await supabase
        .from('book_comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', allCommentIds)

      const likesArray = (likes || []) as { comment_id: string }[]
      const likedCommentIds = new Set(likesArray.map(l => l.comment_id))

      commentsWithLikes = commentsArray.map(comment => {
        const replies = ((comment as Record<string, unknown>).replies as Record<string, unknown>[]) || []
        return {
          ...comment,
          is_liked: likedCommentIds.has(comment.id),
          replies: replies.map(reply => ({
            ...reply,
            is_liked: likedCommentIds.has(reply.id as string),
          })),
        }
      })
    }

    const nextCursor = commentsArray.length === limit
      ? commentsArray[commentsArray.length - 1].created_at
      : null

    return NextResponse.json({
      comments: commentsWithLikes,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
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
    const validation = validate(createBookCommentSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('book_comments')
      .insert({
        user_id: user.id,
        book_id,
        content: validation.data.content,
        parent_id: validation.data.parent_id || null,
      } as never)
      .select(`
        *,
        user:users!book_comments_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
