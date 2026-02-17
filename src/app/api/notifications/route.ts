import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Return empty for unauthenticated users instead of error
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    let query = supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        body,
        data,
        read,
        is_read,
        post_id,
        actor_id,
        created_at,
        actor:users!notifications_actor_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      // If table doesn't exist or join fails, fallback to simple query
      console.error('Notifications error:', error.message)

      const { data: simpleNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      return NextResponse.json({
        notifications: simpleNotifications || [],
        unreadCount: count || 0,
      })
    }

    // Get unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    // Normalize is_read field
    const normalizedNotifications = (notifications || []).map(n => {
      const obj = n as Record<string, unknown>
      return {
        ...obj,
        is_read: obj.is_read ?? obj.read ?? false,
      }
    })

    return NextResponse.json({
      notifications: normalizedNotifications,
      unreadCount: count || 0,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}

// Mark all notifications as read
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true } as never)
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
