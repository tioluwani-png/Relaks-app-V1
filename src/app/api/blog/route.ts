import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    let query = supabase
      .from('blog_posts')
      .select(`
        id,
        title,
        slug,
        excerpt,
        cover_image_url,
        category,
        status,
        published_at,
        read_time_minutes,
        view_count,
        created_at,
        updated_at,
        author:users!blog_posts_author_id_fkey(id, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: posts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown }

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, slug, excerpt, content, cover_image_url, category, tags, status, published_at } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const wordCount = content.trim().split(/\s+/).length
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    const postData = {
      title: title.trim(),
      slug: slug?.trim() || generateSlug(title),
      excerpt: excerpt?.trim() || content.substring(0, 160),
      content: content.trim(),
      cover_image_url: cover_image_url || null,
      category: category || 'general',
      tags: tags || [],
      status: status || 'draft',
      published_at: status === 'published' ? (published_at || new Date().toISOString()) : null,
      read_time_minutes: readTime,
      author_id: user.id,
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert(postData as never)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)
}
