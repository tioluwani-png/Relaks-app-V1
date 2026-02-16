import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { startOfWeek, startOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'week'

  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('is_public', true)
      .order('like_count', { ascending: false })
      .limit(10)

    // Filter by time period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'week':
        startDate = startOfWeek(now)
        break
      case 'month':
        startDate = startOfMonth(now)
        break
      case 'all':
      default:
        startDate = new Date(0) // All time
    }

    if (period !== 'all') {
      query = query.gte('created_at', startDate.toISOString())
    }

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add rank to each post
    const postsArray = posts as Record<string, unknown>[] | null
    const rankedPosts = postsArray?.map((post, index) => ({
      ...post,
      rank: index + 1,
    }))

    return NextResponse.json({ posts: rankedPosts })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
