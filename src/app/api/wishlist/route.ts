import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all book IDs that the user has saved
    const { data: savedBooks, error: savedError } = await supabase
      .from('book_saves')
      .select('book_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (savedError) {
      return NextResponse.json({ error: savedError.message }, { status: 500 })
    }

    const savedBooksArray = (savedBooks || []) as { book_id: string; created_at: string }[]

    if (savedBooksArray.length === 0) {
      return NextResponse.json({ books: [], nextCursor: null })
    }

    // Apply cursor-based pagination on the saved books
    let filteredSaves = savedBooksArray
    if (cursor) {
      const cursorIndex = savedBooksArray.findIndex(s => s.created_at === cursor)
      if (cursorIndex !== -1) {
        filteredSaves = savedBooksArray.slice(cursorIndex + 1)
      }
    }

    const paginatedSaves = filteredSaves.slice(0, limit)
    const bookIds = paginatedSaves.map(s => s.book_id)

    // Fetch the actual book data
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select(`
        *,
        genre:book_genres(id, name, slug, color)
      `)
      .in('id', bookIds)
      .eq('is_active', true)

    if (booksError) {
      return NextResponse.json({ error: booksError.message }, { status: 500 })
    }

    const booksArray = (books || []) as Record<string, unknown>[]

    // Check if user has liked each book
    const { data: likes } = await supabase
      .from('book_likes')
      .select('book_id')
      .eq('user_id', user.id)
      .in('book_id', bookIds)

    const likesArray = (likes || []) as { book_id: string }[]
    const likedBookIds = new Set(likesArray.map(l => l.book_id))

    // Get reading status for each book
    const { data: reads } = await supabase
      .from('book_reads')
      .select('book_id, status, rating')
      .eq('user_id', user.id)
      .in('book_id', bookIds)

    const readsArray = (reads || []) as { book_id: string; status: string; rating: number | null }[]
    const readsMap = new Map(readsArray.map(r => [r.book_id, r]))

    // Map books with user data, preserving the save order
    const booksMap = new Map(booksArray.map(book => [book.id as string, book]))
    const booksWithUserData = bookIds
      .map(id => {
        const book = booksMap.get(id)
        if (!book) return null
        const readData = readsMap.get(id)
        return {
          ...book,
          is_liked: likedBookIds.has(id),
          is_saved: true, // All books in wishlist are saved
          user_read_status: readData?.status || null,
          user_rating: readData?.rating || null,
        }
      })
      .filter(Boolean)

    const nextCursor = paginatedSaves.length === limit
      ? paginatedSaves[paginatedSaves.length - 1].created_at
      : null

    return NextResponse.json({
      books: booksWithUserData,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
