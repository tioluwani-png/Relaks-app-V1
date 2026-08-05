import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendDeliveryConfirmationEmail } from '@/lib/email'

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
 * POST /api/club-admin/orders/[id]/deliver
 * Transition: picked_up OR in_transit → delivered
 * Sets delivered_at, expires_at (delivery + duration), status to 'delivered'
 * Sends delivery confirmation email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { id: orderId } = await params

  const user = await verifyClubAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get current subscription state with plan and user
    const { data: subscription, error: fetchError } = await supabase
      .from('rental_subscriptions')
      .select(`
        id, status, picked_up_at, delivered_at, user_id, plan_id,
        plan:rental_plans(duration_days, name),
        user:users(email, username, display_name)
      `)
      .eq('id', orderId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as {
      id: string
      status: string
      picked_up_at: string | null
      delivered_at: string | null
      user_id: string
      plan_id: string
      plan: { duration_days: number; name: string } | null
      user: { email: string; username: string; display_name: string | null } | null
    }

    // Idempotent: already delivered
    if (sub.delivered_at) {
      return NextResponse.json({ success: true, message: 'Already delivered' })
    }

    // Already past delivered stage
    if (['awaiting_return', 'completed'].includes(sub.status)) {
      return NextResponse.json({ success: true, message: 'Already past delivery stage' })
    }

    // Must be picked_up or in_transit to deliver
    if (!['picked_up', 'in_transit'].includes(sub.status)) {
      return NextResponse.json(
        { error: 'Must be picked up before marking as delivered' },
        { status: 400 }
      )
    }

    // Calculate delivery time and expiry
    const now = new Date()
    const durationDays = sub.plan?.duration_days || 30 // Default 30 days if plan not found
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

    // Update subscription - CRITICAL: expires_at is anchored to delivery date
    const { error: updateError } = await adminSupabase
      .from('rental_subscriptions')
      .update({
        status: 'delivered',
        delivered_at: now.toISOString(),
        started_at: now.toISOString(), // Rental period starts at delivery
        expires_at: expiresAt.toISOString(),
      } as never)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('[club-admin/deliver] Order delivered:', {
      orderId,
      delivered_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      duration_days: durationDays,
    })

    // Send delivery confirmation email (non-blocking)
    try {
      if (sub.user) {
        await sendDeliveryConfirmationEmail(
          sub.user.email,
          sub.user.display_name || sub.user.username,
          sub.plan?.name || 'Rental Plan',
          durationDays,
          expiresAt.toISOString()
        )

        // Log email sent (idempotent via unique constraint)
        await adminSupabase
          .from('rental_email_log')
          .insert({
            subscription_id: orderId,
            email_type: 'delivery_confirmation',
          } as never)
          .single()
      }
    } catch (emailError) {
      // Email failure should not fail the delivery action
      console.error('[club-admin/deliver] Email error:', emailError)
    }

    return NextResponse.json({
      success: true,
      delivered_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('[club-admin/deliver] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
