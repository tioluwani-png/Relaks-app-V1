import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // Only allow users to view their own saved posts
    if (!user || user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('saved_posts')
      .select(`
        post_id,
        created_at,
        post:posts!saved_posts_post_id_fkey(
          *,
          user:users!posts_user_id_fkey(id, username, display_name, avatar_url)
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: savedPosts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const savedPostsArray = (savedPosts || []) as { post_id: string; created_at: string; post: Record<string, unknown> }[]

    // Extract just the posts with their data
    const posts = savedPostsArray.map(sp => ({
      ...sp.post,
      is_saved: true,
      saved_at: sp.created_at,
    }))

    const nextCursor = savedPostsArray.length === limit
      ? savedPostsArray[savedPostsArray.length - 1].created_at
      : null

    return NextResponse.json({
      posts,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching saved posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
