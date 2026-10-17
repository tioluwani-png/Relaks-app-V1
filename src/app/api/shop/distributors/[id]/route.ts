import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeNigerianPhone } from '@/lib/shop/config'

// Helper to check admin
async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes((profile as { role: string }).role)) {
    return null
  }

  return user
}

// PATCH - Update distributor
const updateSchema = z.object({
  city: z.string().min(1).max(100).trim().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  whatsapp_number: z.string().min(10).max(20).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await checkAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = { ...validation.data }

    // Normalize phone if provided
    if (updates.whatsapp_number) {
      const normalizedPhone = normalizeNigerianPhone(updates.whatsapp_number as string)
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: 'Invalid Nigerian phone number. Use format like 09033662304 or +2349033662304' },
          { status: 400 }
        )
      }
      updates.whatsapp_number = normalizedPhone
    }

    const adminSupabase = await createAdminClient()

    const { data, error } = await adminSupabase
      .from('distributors')
      .update(updates as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[distributors] Update error:', error)
      return NextResponse.json({ error: 'Failed to update distributor' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[distributors] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete distributor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await checkAdmin(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { error } = await adminSupabase
      .from('distributors')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[distributors] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete distributor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[distributors] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
