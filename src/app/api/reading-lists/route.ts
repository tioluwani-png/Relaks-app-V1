import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createReadingListSchema, validate } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '20')
  const userId = searchParams.get('user_id')
  const onlyMine = searchParams.get('mine') === 'true'

  try {
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('reading_lists')
      .select(`
        *,
        user:users!reading_lists_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)

    // Filter by specific user
    if (userId) {
      query = query.eq('user_id', userId)
      // Show private lists only if viewing own lists
      if (user && userId !== user.id) {
        query = query.eq('is_public', true)
      }
    } else if (onlyMine && user) {
      // Show all of user's own lists (public and private)
      query = query.eq('user_id', user.id)
    } else {
      // Show only public lists
      query = query.eq('is_public', true)
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: lists, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const listsArray = (lists || []) as { id: string; created_at: string; [key: string]: unknown }[]

    // Check if user follows each list
    let listsWithFollows = listsArray
    if (user && listsArray.length > 0) {
      const listIds = listsArray.map(l => l.id)

      const { data: follows } = await supabase
        .from('reading_list_follows')
        .select('list_id')
        .eq('user_id', user.id)
        .in('list_id', listIds)

      const followsArray = (follows || []) as { list_id: string }[]
      const followedListIds = new Set(followsArray.map(f => f.list_id))

      listsWithFollows = listsArray.map(list => ({
        ...list,
        is_following: followedListIds.has(list.id),
      }))
    }

    const nextCursor = listsArray.length === limit
      ? listsArray[listsArray.length - 1].created_at
      : null

    return NextResponse.json({
      lists: listsWithFollows,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching reading lists:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validate(createReadingListSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data: list, error } = await supabase
      .from('reading_lists')
      .insert({
        user_id: user.id,
        ...validation.data,
      } as never)
      .select(`
        *,
        user:users!reading_lists_user_id_fkey(id, username, display_name, avatar_url, is_verified, verification_type)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ list }, { status: 201 })
  } catch (error) {
    console.error('Error creating reading list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
