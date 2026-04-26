import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const editionSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  display_name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  gradient_from: z.string().max(30),
  gradient_to: z.string().max(30),
  gradient_bg: z.string().max(60),
  cover_image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
  display_order: z.number().int().min(0).optional(),
})

const updateEditionSchema = editionSchema.partial().extend({
  id: z.string().uuid(),
})

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

export async function GET() {
  const supabase = await createClient()

  const user = await verifyAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: editions, error } = await supabase
      .from('editions')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ editions: editions || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const user = await verifyAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = editionSchema.safeParse(body)

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid input' },
        { status: 400 }
      )
    }

    // Auto-set display_order if not provided
    if (parsed.data.display_order === undefined) {
      const { data: maxOrder } = await supabase
        .from('editions')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single() as { data: { display_order: number } | null; error: unknown }

      parsed.data.display_order = (maxOrder?.display_order ?? 0) + 1
    }

    const { data: edition, error } = await supabase
      .from('editions')
      .insert(parsed.data as never)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An edition with this slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ edition }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const user = await verifyAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = updateEditionSchema.safeParse(body)

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid input' },
        { status: 400 }
      )
    }

    const { id, ...updates } = parsed.data

    const { data: edition, error } = await supabase
      .from('editions')
      .update(updates as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ edition })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const user = await verifyAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Edition ID is required' }, { status: 400 })
    }

    // Soft-delete: set is_active = false to preserve referential integrity
    const { error } = await supabase
      .from('editions')
      .update({ is_active: false } as never)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
