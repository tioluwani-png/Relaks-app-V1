import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  const { searchParams } = new URL(request.url)
  const edition = searchParams.get('edition')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ users: [] })
    }

    // Get users the current user is NOT following
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (following || []).map((f: { following_id: string }) => f.following_id)
    followingIds.push(user.id) // Exclude self

    // Build query for suggestions
    let query = adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, editions_owned, follower_count')
      .not('id', 'in', `(${followingIds.join(',')})`)
      .eq('is_banned', false)
      .order('follower_count', { ascending: false })
      .limit(10)

    const { data: users, error } = await query

    if (error) {
      console.error('[users/suggestions] Error:', error)
      return NextResponse.json({ users: [] })
    }

    // Filter by edition if specified
    let filteredUsers = (users || []) as {
      id: string
      username: string
      display_name: string | null
      avatar_url: string | null
      editions_owned: string[]
      follower_count: number
    }[]

    if (edition) {
      // Prioritize users who own the same edition
      const sameEditionUsers = filteredUsers.filter(u =>
        u.editions_owned && u.editions_owned.includes(edition)
      )
      const otherUsers = filteredUsers.filter(u =>
        !u.editions_owned || !u.editions_owned.includes(edition)
      )
      filteredUsers = [...sameEditionUsers, ...otherUsers].slice(0, 5)
    } else {
      filteredUsers = filteredUsers.slice(0, 5)
    }

    return NextResponse.json({
      users: filteredUsers.map(u => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
      })),
    })
  } catch (error) {
    console.error('[users/suggestions] Error:', error)
    return NextResponse.json({ users: [] })
  }
}
