import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateReadingListSchema, validate } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: list, error } = await supabase
      .from('reading_lists')
      .select(`
        *,
        user:users!reading_lists_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .eq('id', id)
      .single()

    if (error || !list) {
      return NextResponse.json({ error: 'Reading list not found' }, { status: 404 })
    }

    const listData = list as { is_public: boolean; user_id: string; [key: string]: unknown }

    // Check if user can view this list
    if (!listData.is_public && (!user || listData.user_id !== user.id)) {
      return NextResponse.json({ error: 'Reading list not found' }, { status: 404 })
    }

    // Get books in the list
    const { data: items } = await supabase
      .from('reading_list_items')
      .select(`
        position,
        notes,
        added_at,
        book:books(
          id,
          title,
          author,
          cover_url,
          description,
          genre:book_genres(id, name, slug, color)
        )
      `)
      .eq('list_id', id)
      .order('position', { ascending: true })

    const itemsArray = (items || []) as { position: number; notes: string | null; added_at: string; book: Record<string, unknown> }[]

    // Check if user follows this list
    let isFollowing = false
    if (user && listData.user_id !== user.id) {
      const { data: follow } = await supabase
        .from('reading_list_follows')
        .select('list_id')
        .eq('user_id', user.id)
        .eq('list_id', id)
        .single()

      isFollowing = !!follow
    }

    return NextResponse.json({
      list: {
        ...listData,
        books: itemsArray.map(item => ({
          ...item.book,
          position: item.position,
          notes: item.notes,
          added_at: item.added_at,
        })),
        is_following: isFollowing,
      },
    })
  } catch (error) {
    console.error('Error fetching reading list:', error)
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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { data: existingList } = await supabase
      .from('reading_lists')
      .select('user_id')
      .eq('id', id)
      .single()

    const existingData = existingList as { user_id: string } | null
    if (!existingData || existingData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = validate(updateReadingListSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data: list, error } = await supabase
      .from('reading_lists')
      .update(validation.data as never)
      .eq('id', id)
      .select(`
        *,
        user:users!reading_lists_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error updating reading list:', error)
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

    // Check ownership
    const { data: existingList } = await supabase
      .from('reading_lists')
      .select('user_id')
      .eq('id', id)
      .single()

    const existingData = existingList as { user_id: string } | null
    if (!existingData || existingData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('reading_lists')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reading list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
