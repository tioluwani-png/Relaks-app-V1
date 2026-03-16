import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
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

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('blog_comment_likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('comment_id', id)
      .single()

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 })
    }

    const { error } = await supabase
      .from('blog_comment_likes')
      .insert({
        user_id: user.id,
        comment_id: id,
      } as never)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ liked: true })
  } catch (error) {
    console.error('Error liking blog comment:', error)
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

    const { error } = await supabase
      .from('blog_comment_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('comment_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ liked: false })
  } catch (error) {
    console.error('Error unliking blog comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
