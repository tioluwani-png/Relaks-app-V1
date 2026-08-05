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
 * POST /api/club-admin/orders/[id]/process
 * Transition: active → processing
 * Indicates order is being prepared for fulfillment
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
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as { id: string; status: string }

    // Idempotent: already processing or beyond
    if (sub.status === 'processing') {
      return NextResponse.json({ success: true, message: 'Already processing' })
    }

    // Already past processing stage
    if (['picked_up', 'in_transit', 'delivered', 'awaiting_return', 'completed'].includes(sub.status)) {
      return NextResponse.json({ success: true, message: 'Already past processing stage' })
    }

    // Must be active (paid) to start processing
    if (sub.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only start processing for paid (active) subscriptions' },
        { status: 400 }
      )
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('rental_subscriptions')
      .update({ status: 'processing' } as never)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('[club-admin/process] Order processing started:', orderId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[club-admin/process] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
