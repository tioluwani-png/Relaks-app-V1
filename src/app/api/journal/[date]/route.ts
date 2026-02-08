import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const supabase = await createClient()
  const { date } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: entry || null })
  } catch (error) {
    console.error('Error fetching journal entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const supabase = await createClient()
  const { date } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, mood, prompt_used } = body
    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0

    const { data: entry, error } = await supabase
      .from('journal_entries')
      .update({
        content,
        mood,
        prompt_used,
        word_count: wordCount,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('user_id', user.id)
      .eq('entry_date', date)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Error updating journal entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
