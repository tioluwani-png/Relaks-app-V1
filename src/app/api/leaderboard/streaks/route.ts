import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, verification_type, journal_streak')
      .gt('journal_streak', 0)
      .order('journal_streak', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const usersArray = users as Record<string, unknown>[] | null
    const rankedUsers = usersArray?.map((user, index) => ({
      ...user,
      rank: index + 1,
    }))

    return NextResponse.json({ users: rankedUsers })
  } catch (error) {
    console.error('Error fetching streak leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
