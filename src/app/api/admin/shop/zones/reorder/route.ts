import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const reorderSchema = z.object({
  zoneIds: z.array(z.string().uuid()),
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
 * POST /api/admin/shop/zones/reorder
 * Reorder zones by providing an array of zone IDs in the desired order
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = reorderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { zoneIds } = validation.data
    const adminSupabase = await createAdminClient()

    // Update sort_order for each zone
    for (let i = 0; i < zoneIds.length; i++) {
      await adminSupabase
        .from('shop_delivery_zones')
        .update({ sort_order: i } as never)
        .eq('id', zoneIds[i])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/shop/zones/reorder] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
