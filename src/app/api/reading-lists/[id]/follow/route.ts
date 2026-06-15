import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: list_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if list exists and is public
    const { data: list } = await supabase
      .from('reading_lists')
      .select('user_id, is_public')
      .eq('id', list_id)
      .single()

    const listData = list as { user_id: string; is_public: boolean } | null
    if (!listData) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    if (!listData.is_public) {
      return NextResponse.json({ error: 'Cannot follow private list' }, { status: 400 })
    }

    if (listData.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow your own list' }, { status: 400 })
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('reading_list_follows')
      .select('list_id')
      .eq('user_id', user.id)
      .eq('list_id', list_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already following' }, { status: 400 })
    }

    const { error } = await supabase
      .from('reading_list_follows')
      .insert({ user_id: user.id, list_id } as never)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ following: true }, { status: 201 })
  } catch (error) {
    console.error('Error following list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: list_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('reading_list_follows')
      .delete()
      .eq('user_id', user.id)
      .eq('list_id', list_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ following: false })
  } catch (error) {
    console.error('Error unfollowing list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
