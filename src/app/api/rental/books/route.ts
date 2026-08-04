import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/rental/books
 * Returns books available for rental from the main books table.
 * Used by checkout to validate selected books.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookIds = searchParams.get('ids') // Optional: filter by specific IDs

    const supabase = await createClient()

    let query = supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        description,
        cover_url,
        genre:book_genres(id, name, slug)
      `)
      .eq('is_active', true)
      .order('title', { ascending: true })

    // If specific book IDs requested, filter to those
    if (bookIds) {
      const ids = bookIds.split(',').filter(Boolean)
      query = query.in('id', ids)
    }

    const { data: books, error } = await query

    if (error) {
      console.error('[rental/books] Error:', error)
      return NextResponse.json({ error: 'Failed to load books' }, { status: 500 })
    }

    // Type the books result
    type BookResult = {
      id: string
      title: string
      author: string
      description: string | null
      cover_url: string | null
      genre: { id: string; name: string; slug: string } | null
    }

    const typedBooks = (books || []) as BookResult[]

    // Transform to match expected shape (flatten genre)
    const transformedBooks = typedBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      cover_url: book.cover_url,
      genre: book.genre?.name || null,
    }))

    return NextResponse.json(transformedBooks)
  } catch (error) {
    console.error('[rental/books] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
