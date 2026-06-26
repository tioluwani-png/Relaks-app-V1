import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addBookToListSchema, validate } from '@/lib/validations'

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

    // Check ownership
    const { data: existingList } = await supabase
      .from('reading_lists')
      .select('user_id, book_count')
      .eq('id', list_id)
      .single()

    const listData = existingList as { user_id: string; book_count: number } | null
    if (!listData || listData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = validate(addBookToListSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { book_id, notes } = validation.data

    // Check if book already in list
    const { data: existing } = await supabase
      .from('reading_list_items')
      .select('list_id')
      .eq('list_id', list_id)
      .eq('book_id', book_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Book already in list' }, { status: 400 })
    }

    // Get next position
    const position = (listData.book_count || 0) + 1

    const { data: item, error } = await supabase
      .from('reading_list_items')
      .insert({
        list_id,
        book_id,
        position,
        notes: notes || null,
      } as never)
      .select(`
        position,
        notes,
        added_at,
        book:books(
          id,
          title,
          author,
          cover_url,
          genre:book_genres(id, name, slug, color)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error adding book to list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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

    // Check ownership
    const { data: existingList } = await supabase
      .from('reading_lists')
      .select('user_id')
      .eq('id', list_id)
      .single()

    const listData = existingList as { user_id: string } | null
    if (!listData || listData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { book_id, notes } = body

    if (!book_id) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('reading_list_items')
      .update({ notes: notes || null } as never)
      .eq('list_id', list_id)
      .eq('book_id', book_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating book notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: list_id } = await params
  const { searchParams } = new URL(request.url)
  const book_id = searchParams.get('book_id')

  if (!book_id) {
    return NextResponse.json({ error: 'book_id is required' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { data: existingList } = await supabase
      .from('reading_lists')
      .select('user_id')
      .eq('id', list_id)
      .single()

    const listData = existingList as { user_id: string } | null
    if (!listData || listData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('reading_list_items')
      .delete()
      .eq('list_id', list_id)
      .eq('book_id', book_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing book from list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
