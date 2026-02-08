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

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saved_posts')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', id)
      .single()

    if (existingSave) {
      return NextResponse.json({ error: 'Already saved' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_posts')
      .insert({
        user_id: user.id,
        post_id: id,
      } as never)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error('Error saving post:', error)
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
      .from('saved_posts')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: false })
  } catch (error) {
    console.error('Error unsaving post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
