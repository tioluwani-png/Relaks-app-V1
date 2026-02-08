import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!comments_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('post_id', id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get replies for each comment
    const commentsArray = (comments || []) as { id: string; [key: string]: unknown }[]
    const commentsWithReplies = await Promise.all(
      commentsArray.map(async (comment) => {
        const { data: replies } = await supabase
          .from('comments')
          .select(`
            *,
            user:users!comments_user_id_fkey(id, username, display_name, avatar_url)
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true })

        return {
          ...comment,
          replies: replies || [],
        }
      })
    )

    return NextResponse.json({ comments: commentsWithReplies })
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
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, parent_id } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment is too long (max 500 characters)' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      } as never)
      .select(`
        *,
        user:users!comments_user_id_fkey(id, username, display_name, avatar_url)
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
