import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genre = searchParams.get('genre')

    const supabase = await createClient()

    let query = supabase
      .from('rental_books')
      .select('*')
      .eq('is_active', true)
      .gt('available_copies', 0)
      .order('title', { ascending: true })

    if (genre && genre !== 'all') {
      query = query.eq('genre', genre)
    }

    const { data: books, error } = await query

    if (error) {
      console.error('[rental/books] Error:', error)
      return NextResponse.json({ error: 'Failed to load books' }, { status: 500 })
    }

    return NextResponse.json(books)
  } catch (error) {
    console.error('[rental/books] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
