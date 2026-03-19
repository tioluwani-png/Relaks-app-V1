import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { notifyUsersOfNewPost } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown }

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { postId } = await request.json()
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }

    // Fetch post details
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, cover_image_url')
      .eq('id', postId)
      .single() as { data: { title: string; slug: string; excerpt: string | null; cover_image_url: string | null } | null; error: unknown }

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, display_name, username')

    if (usersError || !users || users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 })
    }

    // Send notifications (fire-and-forget)
    notifyUsersOfNewPost(
      users as { email: string; display_name: string | null; username: string }[],
      post.title,
      post.excerpt || post.title,
      post.slug,
      post.cover_image_url
    ).catch(err => console.error('Blog notification error:', err))

    return NextResponse.json({
      success: true,
      message: `Sending notifications to ${users.length} users`,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
