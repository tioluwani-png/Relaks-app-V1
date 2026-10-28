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

    // Use upsert with on conflict do nothing (idempotent)
    const { error } = await supabase
      .from('likes')
      .upsert(
        { user_id: user.id, post_id: id } as never,
        { onConflict: 'user_id,post_id', ignoreDuplicates: true }
      )

    if (error) {
      console.error('[like] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch actual count from database (source of truth)
    const { data: post } = await supabase
      .from('posts')
      .select('like_count')
      .eq('id', id)
      .single()

    return NextResponse.json({
      liked: true,
      like_count: (post as { like_count: number } | null)?.like_count ?? 0,
    })
  } catch (error) {
    console.error('Error liking post:', error)
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
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', id)

    if (error) {
      console.error('[unlike] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch actual count from database (source of truth)
    const { data: post } = await supabase
      .from('posts')
      .select('like_count')
      .eq('id', id)
      .single()

    return NextResponse.json({
      liked: false,
      like_count: (post as { like_count: number } | null)?.like_count ?? 0,
    })
  } catch (error) {
    console.error('Error unliking post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
