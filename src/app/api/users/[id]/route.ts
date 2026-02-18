import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateProfileSchema, validate } from '@/lib/validations'

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

    // Get accurate follower/following counts from the follows table
    const [{ count: followerCount }, { count: followingCount }, { data: posts }] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userData.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userData.id),
      supabase
        .from('posts')
        .select('*')
        .eq('user_id', userData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    return NextResponse.json({
      user: {
        ...userData,
        follower_count: followerCount ?? 0,
        following_count: followingCount ?? 0,
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
    const validation = validate(updateProfileSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Only allow safe fields to be updated (no role, credits, ban status, etc.)
    const { display_name, bio, avatar_url, editions_owned } = validation.data

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (display_name !== undefined) updateData.display_name = display_name
    if (bio !== undefined) updateData.bio = bio
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (editions_owned !== undefined) updateData.editions_owned = editions_owned

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData as never)
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
