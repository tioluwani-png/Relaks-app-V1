import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateReadStatusSchema, validate } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: book_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: readStatus, error } = await supabase
      .from('book_reads')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', book_id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ readStatus: readStatus || null })
  } catch (error) {
    console.error('Error fetching read status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: book_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validate(updateReadStatusSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { status, rating } = validation.data

    // Prepare data based on status
    const now = new Date().toISOString()
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      book_id,
      status,
      rating: rating ?? null,
    }

    if (status === 'reading') {
      insertData.started_at = now
    } else if (status === 'read' || status === 'dnf') {
      insertData.finished_at = now
    }

    // Use upsert to handle both insert and update
    const { data: readStatus, error } = await supabase
      .from('book_reads')
      .upsert(insertData as never, {
        onConflict: 'user_id,book_id',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ readStatus }, { status: 201 })
  } catch (error) {
    console.error('Error updating read status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: book_id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('book_reads')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', book_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing read status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
