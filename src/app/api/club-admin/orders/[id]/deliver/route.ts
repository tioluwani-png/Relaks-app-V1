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
      .select('id, status, dispatched_at, delivered_at, started_at, plan_id')
      .eq('id', orderId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as {
      id: string
      status: string
      dispatched_at: string | null
      delivered_at: string | null
      started_at: string | null
      plan_id: string
    }

    // Idempotent: already delivered
    if (sub.delivered_at) {
      return NextResponse.json({ success: true, message: 'Already delivered' })
    }

    // Must be dispatched first
    if (!sub.dispatched_at) {
      return NextResponse.json({ error: 'Must dispatch before marking as delivered' }, { status: 400 })
    }

    // Must be active
    if (sub.status !== 'active') {
      return NextResponse.json({ error: 'Can only deliver active subscriptions' }, { status: 400 })
    }

    const now = new Date()
    const updates: Record<string, unknown> = {
      delivered_at: now.toISOString(),
    }

    // If not started yet, set started_at and calculate expires_at
    if (!sub.started_at) {
      updates.started_at = now.toISOString()

      // Get plan duration to calculate expiry
      const { data: plan } = await supabase
        .from('rental_plans')
        .select('duration_days')
        .eq('id', sub.plan_id)
        .single()

      if (plan) {
        const planData = plan as { duration_days: number }
        const expiresAt = new Date(now)
        expiresAt.setDate(expiresAt.getDate() + planData.duration_days)
        updates.expires_at = expiresAt.toISOString()
      }
    }

    // Update subscription
    const { error: updateError } = await supabase
      .from('rental_subscriptions')
      .update(updates as never)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deliver error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
