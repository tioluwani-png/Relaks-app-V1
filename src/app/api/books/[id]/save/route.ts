import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

    // Check if already saved
    const { data: existing } = await supabase
      .from('book_saves')
      .select('book_id')
      .eq('user_id', user.id)
      .eq('book_id', book_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already saved' }, { status: 400 })
    }

    const { error } = await supabase
      .from('book_saves')
      .insert({ user_id: user.id, book_id } as never)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: true }, { status: 201 })
  } catch (error) {
    console.error('Error saving book:', error)
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
      .from('book_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', book_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: false })
  } catch (error) {
    console.error('Error removing saved book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
