import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createBookRequestSchema, validate } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || 'pending'
  const sort = searchParams.get('sort') || 'votes' // votes, newest

  try {
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('book_requests')
      .select(`
        *,
        user:users!book_requests_user_id_fkey(id, username, display_name, avatar_url)
      `)

    // Filter by status (admin might want to see all)
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply sorting
    if (sort === 'votes') {
      query = query.order('vote_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: requests, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const requestsArray = (requests || []) as { id: string; created_at: string; [key: string]: unknown }[]

    // Check if user has voted on each request
    let requestsWithVotes = requestsArray
    if (user && requestsArray.length > 0) {
      const requestIds = requestsArray.map(r => r.id)

      const { data: votes } = await supabase
        .from('book_request_votes')
        .select('request_id')
        .eq('user_id', user.id)
        .in('request_id', requestIds)

      const votesArray = (votes || []) as { request_id: string }[]
      const votedRequestIds = new Set(votesArray.map(v => v.request_id))

      requestsWithVotes = requestsArray.map(req => ({
        ...req,
        has_voted: votedRequestIds.has(req.id),
      }))
    }

    const nextCursor = requestsArray.length === limit
      ? requestsArray[requestsArray.length - 1].created_at
      : null

    return NextResponse.json({
      requests: requestsWithVotes,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching book requests:', error)
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
    const validation = validate(createBookRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check for duplicate request (same title from same user)
    const { data: existing } = await supabase
      .from('book_requests')
      .select('id')
      .eq('user_id', user.id)
      .ilike('book_title', validation.data.book_title)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You have already requested this book' }, { status: 400 })
    }

    const { data: bookRequest, error } = await supabase
      .from('book_requests')
      .insert({
        user_id: user.id,
        vote_count: 1, // Initialize with 1 since user auto-votes
        ...validation.data,
      } as never)
      .select(`
        *,
        user:users!book_requests_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const requestData = bookRequest as { id: string; [key: string]: unknown }

    // Auto-vote for the user's own request
    await supabase
      .from('book_request_votes')
      .insert({
        user_id: user.id,
        request_id: requestData.id,
      } as never)

    return NextResponse.json({
      request: { ...requestData, has_voted: true },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating book request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
