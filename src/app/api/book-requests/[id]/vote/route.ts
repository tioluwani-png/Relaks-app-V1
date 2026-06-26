import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: request_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already voted
    const { data: existing } = await supabase
      .from('book_request_votes')
      .select('request_id')
      .eq('user_id', user.id)
      .eq('request_id', request_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 })
    }

    // Get current vote count
    const { data: requestData } = await supabase
      .from('book_requests')
      .select('vote_count')
      .eq('id', request_id)
      .single()

    const requestInfo = requestData as { vote_count: number } | null
    if (!requestInfo) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Insert vote and update count in parallel
    const [insertResult] = await Promise.all([
      supabase
        .from('book_request_votes')
        .insert({ user_id: user.id, request_id } as never),
      supabase
        .from('book_requests')
        .update({ vote_count: (requestInfo.vote_count || 0) + 1 } as never)
        .eq('id', request_id),
    ])

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ voted: true }, { status: 201 })
  } catch (error) {
    console.error('Error voting for request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: request_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current vote count
    const { data: requestData } = await supabase
      .from('book_requests')
      .select('vote_count')
      .eq('id', request_id)
      .single()

    const requestInfo = requestData as { vote_count: number } | null

    // Delete vote and update count in parallel
    const [deleteResult] = await Promise.all([
      supabase
        .from('book_request_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('request_id', request_id),
      supabase
        .from('book_requests')
        .update({ vote_count: Math.max(0, (requestInfo?.vote_count || 1) - 1) } as never)
        .eq('id', request_id),
    ])

    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ voted: false })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
