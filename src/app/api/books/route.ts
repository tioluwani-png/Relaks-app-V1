import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createBookSchema, validate } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '20')
  const genre = searchParams.get('genre')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'newest' // newest, most_saved, most_liked

  try {
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
      .from('books')
      .select(`
        *,
        genre:book_genres(id, name, slug, color)
      `)
      .eq('is_active', true)

    // Apply genre filter
    if (genre) {
      const { data: genreData } = await supabase
        .from('book_genres')
        .select('id')
        .eq('slug', genre)
        .single()

      const genreResult = genreData as { id: string } | null
      if (genreResult) {
        query = query.eq('genre_id', genreResult.id)
      }
    }

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
    }

    // Apply sorting
    switch (sort) {
      case 'most_saved':
        query = query.order('save_count', { ascending: false })
        break
      case 'most_liked':
        query = query.order('like_count', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      default: // newest
        query = query.order('created_at', { ascending: false })
    }

    query = query.limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: books, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const booksArray = (books || []) as { id: string; created_at: string; [key: string]: unknown }[]

    // Get user's likes, saves, and read status if authenticated
    let booksWithUserData = booksArray
    if (user && booksArray.length > 0) {
      const bookIds = booksArray.map(b => b.id)

      const [likesResult, savesResult, readsResult] = await Promise.all([
        supabase
          .from('book_likes')
          .select('book_id')
          .eq('user_id', user.id)
          .in('book_id', bookIds),
        supabase
          .from('book_saves')
          .select('book_id')
          .eq('user_id', user.id)
          .in('book_id', bookIds),
        supabase
          .from('book_reads')
          .select('book_id, status, rating')
          .eq('user_id', user.id)
          .in('book_id', bookIds),
      ])

      const likesArray = (likesResult.data || []) as { book_id: string }[]
      const savesArray = (savesResult.data || []) as { book_id: string }[]
      const readsArray = (readsResult.data || []) as { book_id: string; status: string; rating: number | null }[]
      const likedBookIds = new Set(likesArray.map(l => l.book_id))
      const savedBookIds = new Set(savesArray.map(s => s.book_id))
      const readStatusMap = new Map(
        readsArray.map(r => [r.book_id, { status: r.status, rating: r.rating }])
      )

      booksWithUserData = booksArray.map(book => ({
        ...book,
        is_liked: likedBookIds.has(book.id),
        is_saved: savedBookIds.has(book.id),
        user_read_status: readStatusMap.get(book.id)?.status || null,
        user_rating: readStatusMap.get(book.id)?.rating || null,
      }))
    }

    const nextCursor = booksArray.length === limit
      ? booksArray[booksArray.length - 1].created_at
      : null

    return NextResponse.json({
      books: booksWithUserData,
      nextCursor,
    })
  } catch (error) {
    console.error('Error fetching books:', error)
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: string } | null
    if (!profileData || !['admin', 'super_admin'].includes(profileData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = validate(createBookSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const adminSupabase = await createAdminClient()
    const { data: book, error } = await adminSupabase
      .from('books')
      .insert({
        ...validation.data,
        created_by: user.id,
      } as never)
      .select(`
        *,
        genre:book_genres(id, name, slug, color)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ book }, { status: 201 })
  } catch (error) {
    console.error('Error creating book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
