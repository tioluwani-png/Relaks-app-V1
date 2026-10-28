import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createPostSchema, validate } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '10')
  const following = searchParams.get('following') === 'true'
  const edition = searchParams.get('edition')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    // Filter by edition (My edition tab)
    if (edition) {
      query = query.eq('edition', edition)
    }

    // If following tab, filter by followed users
    if (following && user) {
      const { data: followedUsers } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followedUsersArray = followedUsers as { following_id: string }[] | null
      if (followedUsersArray && followedUsersArray.length > 0) {
        const followedIds = followedUsersArray.map(f => f.following_id)
        query = query.in('user_id', followedIds)
      } else {
        return NextResponse.json({ posts: [], nextCursor: null })
      }
    }

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const postsArray = (posts || []) as { id: string; created_at: string; [key: string]: unknown }[]

    // Get first comment for each post
    const postIds = postsArray.map(p => p.id)
    let firstComments: Record<string, { id: string; content: string; user: { username: string } }> = {}

    if (postIds.length > 0) {
      const { data: comments } = await supabase
        .from('comments')
        .select('id, post_id, content, user:users!comments_user_id_fkey(username)')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })

      // Group by post_id, take first
      for (const comment of (comments || []) as { id: string; post_id: string; content: string; user: { username: string } }[]) {
        if (!firstComments[comment.post_id]) {
          firstComments[comment.post_id] = {
            id: comment.id,
            content: comment.content,
            user: comment.user,
          }
        }
      }
    }

    // Check if user has liked/saved each post
    let postsWithExtras: Record<string, unknown>[] = postsArray
    if (user && postsArray.length > 0) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds)

      const { data: saves } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds)

      const likesArray = (likes || []) as { post_id: string }[]
      const savesArray = (saves || []) as { post_id: string }[]
      const likedPostIds = new Set(likesArray.map(l => l.post_id))
      const savedPostIds = new Set(savesArray.map(s => s.post_id))

      postsWithExtras = postsArray.map(post => ({
        ...post,
        is_liked: likedPostIds.has(post.id),
        is_saved: savedPostIds.has(post.id),
        first_comment: firstComments[post.id] || null,
      }))
    } else {
      postsWithExtras = postsArray.map(post => ({
        ...post,
        first_comment: firstComments[post.id] || null,
      }))
    }

    const nextCursor = postsArray.length === limit
      ? postsArray[postsArray.length - 1].created_at
      : null

    return NextResponse.json({
      posts: postsWithExtras,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validate(createPostSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { image_url, thumbnail_url, caption, edition, page_number, is_public } = validation.data

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        image_url,
        thumbnail_url,
        caption,
        edition,
        page_number,
        is_public,
      } as never)
      .select(`
        *,
        user:users!posts_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
