import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createBlogCommentSchema, validate } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { slug } = await params

  try {
    // Resolve slug to blog_post id
    const { data: post } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .single() as { data: { id: string } | null; error: unknown }

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    // Get current user for like status
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch top-level comments
    const { data: comments, error } = await supabase
      .from('blog_comments')
      .select(`
        *,
        user:users!blog_comments_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .eq('blog_post_id', post.id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const commentsArray = (comments || []) as { id: string; [key: string]: unknown }[]

    // Get replies and like status for each comment
    const commentsWithReplies = await Promise.all(
      commentsArray.map(async (comment) => {
        const { data: replies } = await supabase
          .from('blog_comments')
          .select(`
            *,
            user:users!blog_comments_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true })

        let isLiked = false
        const repliesWithLikes = await Promise.all(
          (replies || []).map(async (reply: { id: string; [key: string]: unknown }) => {
            let replyIsLiked = false
            if (user) {
              const { data: like } = await supabase
                .from('blog_comment_likes')
                .select('user_id')
                .eq('user_id', user.id)
                .eq('comment_id', reply.id)
                .single()
              replyIsLiked = !!like
            }
            return { ...reply, is_liked: replyIsLiked }
          })
        )

        if (user) {
          const { data: like } = await supabase
            .from('blog_comment_likes')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('comment_id', comment.id)
            .single()
          isLiked = !!like
        }

        return {
          ...comment,
          is_liked: isLiked,
          replies: repliesWithLikes,
        }
      })
    )

    return NextResponse.json({ comments: commentsWithReplies })
  } catch (error) {
    console.error('Error fetching blog comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { slug } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve slug to blog_post id
    const { data: post } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .single() as { data: { id: string } | null; error: unknown }

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = validate(createBlogCommentSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { content, parent_id } = validation.data

    const { data: comment, error } = await supabase
      .from('blog_comments')
      .insert({
        blog_post_id: post.id,
        user_id: user.id,
        content,
        parent_id: parent_id || null,
      } as never)
      .select(`
        *,
        user:users!blog_comments_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error creating blog comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
