import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Try to find user by ID or username
    let query = supabase.from('users').select('*')

    // Check if it's a UUID or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('username', id.toLowerCase())
    }

    const { data: user, error } = await query.single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = user as { id: string; [key: string]: unknown }

    // Check if current user is following this user
    let is_following = false
    if (currentUser && currentUser.id !== userData.id) {
      const { data: follow } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userData.id)
        .single()

      is_following = !!follow
    }

    // Get user's posts
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userData.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      user: {
        ...userData,
        is_following,
        posts: posts || [],
      },
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { display_name, bio, avatar_url, editions_owned } = body

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        display_name,
        bio,
        avatar_url,
        editions_owned,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
