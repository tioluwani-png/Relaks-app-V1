import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  try {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:users!blog_posts_author_id_fkey(id, display_name, avatar_url, bio)
      `)
      .eq('slug', slug)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  try {
    const user = await verifyAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.title !== undefined) updates.title = body.title.trim()
    if (body.slug !== undefined) updates.slug = body.slug.trim()
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt.trim()
    if (body.content !== undefined) {
      updates.content = body.content.trim()
      const wordCount = body.content.trim().split(/\s+/).length
      updates.read_time_minutes = Math.max(1, Math.ceil(wordCount / 200))
    }
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url || null
    if (body.category !== undefined) updates.category = body.category
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.status !== undefined) {
      updates.status = body.status
      if (body.status === 'published' && !body.published_at) {
        updates.published_at = new Date().toISOString()
      }
    }
    if (body.published_at !== undefined) updates.published_at = body.published_at

    // Find post by slug then update by id
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single() as { data: { id: string } | null; error: unknown }

    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updates as never)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  try {
    const user = await verifyAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('slug', slug)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
