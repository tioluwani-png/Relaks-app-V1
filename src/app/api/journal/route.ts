import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // Format: YYYY-MM

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })

    if (month) {
      const startDate = `${month}-01`
      const [year, monthNum] = month.split('-').map(Number)
      const endDate = `${year}-${String(monthNum + 1).padStart(2, '0')}-01`
      query = query.gte('entry_date', startDate).lt('entry_date', endDate)
    } else {
      query = query.limit(30)
    }

    const { data: entries, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
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
    const { content, mood, prompt_used } = body
    const today = format(new Date(), 'yyyy-MM-dd')

    // Check if entry exists for today
    const { data: existingEntry } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .single()

    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0

    if (existingEntry) {
      // Update existing entry
      const { data: entry, error } = await supabase
        .from('journal_entries')
        .update({
          content,
          mood,
          prompt_used,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', (existingEntry as { id: string }).id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ entry, isNew: false })
    }

    // Create new entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        entry_date: today,
        content,
        mood,
        prompt_used,
        word_count: wordCount,
      } as never)
      .select()
      .single()

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 })
    }

    // Update user's streak
    const { data: userData } = await supabase
      .from('users')
      .select('journal_streak, last_journal_date')
      .eq('id', user.id)
      .single()

    let newStreak = 1
    const userDataTyped = userData as { journal_streak: number; last_journal_date: string | null } | null
    if (userDataTyped) {
      const lastDate = userDataTyped.last_journal_date
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

      if (lastDate === yesterday) {
        newStreak = userDataTyped.journal_streak + 1
      } else if (lastDate === today) {
        newStreak = userDataTyped.journal_streak
      }
    }

    await supabase
      .from('users')
      .update({
        journal_streak: newStreak,
        last_journal_date: today,
      } as never)
      .eq('id', user.id)

    return NextResponse.json({ entry, isNew: true, newStreak }, { status: 201 })
  } catch (error) {
    console.error('Error saving journal entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
