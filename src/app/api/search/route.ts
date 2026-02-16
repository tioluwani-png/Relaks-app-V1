import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') || 'all' // 'users', 'posts', 'pages', 'all'

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  try {
    const results: {
      users: Record<string, unknown>[]
      posts: Record<string, unknown>[]
      pages: Record<string, unknown>[]
    } = {
      users: [],
      posts: [],
      pages: [],
    }

    const searchTerm = `%${query}%`

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, follower_count, is_verified, verification_type')
        .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
        .limit(10)

      results.users = (users || []) as Record<string, unknown>[]
    }

    // Search posts (by caption)
    if (type === 'all' || type === 'posts') {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id,
          image_url,
          caption,
          like_count,
          comment_count,
          created_at,
          user:users!posts_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
        `)
        .eq('is_public', true)
        .ilike('caption', searchTerm)
        .order('like_count', { ascending: false })
        .limit(10)

      results.posts = (posts || []) as Record<string, unknown>[]
    }

    // Search coloring pages
    if (type === 'all' || type === 'pages') {
      const { data: pages } = await supabase
        .from('coloring_pages')
        .select('id, title, description, preview_url, category, is_free, price_naira')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(10)

      results.pages = (pages || []) as Record<string, unknown>[]
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
