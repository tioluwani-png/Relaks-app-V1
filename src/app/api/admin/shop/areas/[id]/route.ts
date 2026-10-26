import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateAreaSchema = z.object({
  zone_id: z.string().uuid().nullable(),
})

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile && ['admin', 'super_admin'].includes((profile as { role: string }).role)
}

/**
 * PATCH /api/admin/shop/areas/[id]
 * Update area (assign to zone)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateAreaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { zone_id } = validation.data
    const adminSupabase = await createAdminClient()

    const { data: updated, error } = await adminSupabase
      .from('shop_delivery_areas')
      .update({ zone_id } as never)
      .eq('id', id)
      .select('*, zone:shop_delivery_zones(*)')
      .single()

    if (error) {
      console.error('[admin/shop/areas] Update error:', error)
      return NextResponse.json({ error: `Failed to update area: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ area: updated })
  } catch (error) {
    console.error('[admin/shop/areas] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/shop/areas/[id]
 * Delete a custom area (only custom areas can be deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = await createAdminClient()

    // Check if it's a custom area
    const { data: area } = await adminSupabase
      .from('shop_delivery_areas')
      .select('is_custom')
      .eq('id', id)
      .single()

    if (!area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    if (!(area as { is_custom: boolean }).is_custom) {
      return NextResponse.json(
        { error: 'Cannot delete a standard LGA. You can only delete custom areas.' },
        { status: 400 }
      )
    }

    const { error } = await adminSupabase
      .from('shop_delivery_areas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[admin/shop/areas] Delete error:', error)
      return NextResponse.json({ error: `Failed to delete area: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[admin/shop/areas] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
