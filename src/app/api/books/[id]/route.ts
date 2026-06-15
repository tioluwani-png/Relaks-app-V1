import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateBookSchema, validate } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: book, error } = await supabase
      .from('books')
      .select(`
        *,
        genre:book_genres(id, name, slug, color)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Get user's interaction with this book
    const bookData = book as Record<string, unknown>
    let bookWithUserData = bookData
    if (user) {
      const [likeResult, saveResult, readResult] = await Promise.all([
        supabase
          .from('book_likes')
          .select('book_id')
          .eq('user_id', user.id)
          .eq('book_id', id)
          .single(),
        supabase
          .from('book_saves')
          .select('book_id')
          .eq('user_id', user.id)
          .eq('book_id', id)
          .single(),
        supabase
          .from('book_reads')
          .select('status, rating')
          .eq('user_id', user.id)
          .eq('book_id', id)
          .single(),
      ])

      const readData = readResult.data as { status?: string; rating?: number } | null
      bookWithUserData = {
        ...bookData,
        is_liked: !!likeResult.data,
        is_saved: !!saveResult.data,
        user_read_status: readData?.status || null,
        user_rating: readData?.rating || null,
      }
    }

    return NextResponse.json({ book: bookWithUserData })
  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const validation = validate(updateBookSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const adminSupabase = await createAdminClient()
    const { data: book, error } = await adminSupabase
      .from('books')
      .update(validation.data as never)
      .eq('id', id)
      .select(`
        *,
        genre:book_genres(id, name, slug, color)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Error updating book:', error)
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

    // Soft delete by setting is_active to false
    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
      .from('books')
      .update({ is_active: false } as never)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
