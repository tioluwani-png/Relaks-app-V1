import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CLUB_ADMIN_ROLES = ['partner', 'admin', 'super_admin']

async function verifyClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (!profile || !CLUB_ADMIN_ROLES.includes(profile.role)) return null
  return user
}

/**
 * POST /api/club-admin/orders/[id]/transit
 * Transition: picked_up → in_transit
 * Stamps in_transit_at timestamp
 * Note: This is an optional step - can skip directly to delivered
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: orderId } = await params

  const user = await verifyClubAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get current subscription state
    const { data: subscription, error: fetchError } = await supabase
      .from('rental_subscriptions')
      .select('id, status, in_transit_at')
      .eq('id', orderId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as { id: string; status: string; in_transit_at: string | null }

    // Idempotent: already in transit
    if (sub.in_transit_at) {
      return NextResponse.json({ success: true, message: 'Already in transit' })
    }

    // Already past transit stage
    if (['delivered', 'awaiting_return', 'completed'].includes(sub.status)) {
      return NextResponse.json({ success: true, message: 'Already past transit stage' })
    }

    // Must be picked_up to mark as in transit
    if (sub.status !== 'picked_up') {
      return NextResponse.json(
        { error: 'Must be picked up before marking as in transit' },
        { status: 400 }
      )
    }

    // Update status and timestamp
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('rental_subscriptions')
      .update({
        status: 'in_transit',
        in_transit_at: now,
      } as never)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('[club-admin/transit] Order in transit:', orderId)

    return NextResponse.json({ success: true, in_transit_at: now })
  } catch (error) {
    console.error('[club-admin/transit] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
