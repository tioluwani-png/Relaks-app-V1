import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users!posts_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const postData = post as { is_public: boolean; user_id: string; [key: string]: unknown }

    // Check if private post and user is not owner
    if (!postData.is_public && (!user || postData.user_id !== user.id)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user has liked/saved the post
    let is_liked = false
    let is_saved = false

    if (user) {
      const { data: like } = await supabase
        .from('likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('post_id', id)
        .single()

      const { data: save } = await supabase
        .from('saved_posts')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('post_id', id)
        .single()

      is_liked = !!like
      is_saved = !!save
    }

    return NextResponse.json({
      post: {
        ...postData,
        is_liked,
        is_saved,
      },
    })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user owns the post
    const { data: postToDelete } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', id)
      .single()

    const postToDeleteData = postToDelete as { user_id: string } | null
    if (!postToDeleteData || postToDeleteData.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
