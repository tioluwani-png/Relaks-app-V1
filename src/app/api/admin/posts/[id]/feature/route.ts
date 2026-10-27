import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { LANDING_GALLERY_TAG } from '@/lib/landing/data'

const STAFF_ROLES = ['moderator', 'admin', 'super_admin']

const bodySchema = z.object({ featured: z.boolean() })

/**
 * PATCH /api/admin/posts/[id]/feature
 * Show or hide a post in the homepage "Colored by the community" gallery.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const adminSupabase = await createAdminClient()
    const { data, error } = await adminSupabase
      .from('posts')
      .update({ featured_on_home: parsed.data.featured } as never)
      .eq('id', id)
      .select('id, featured_on_home')
      .maybeSingle()

    if (error) {
      console.error('[admin/posts/feature] Update error:', error)
      // 42703 = undefined column: the featured_on_home migration hasn't been run yet
      const message = error.code === '42703'
        ? 'Run the featured_on_home migration first'
        : 'Failed to update post'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    revalidateTag(LANDING_GALLERY_TAG, 'max')
    revalidatePath('/')

    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/posts/feature] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
