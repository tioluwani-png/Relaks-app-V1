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
      .select('id, status, dispatched_at, user_id')
      .eq('id', orderId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as { id: string; status: string; dispatched_at: string | null; user_id: string }

    // Idempotent: already dispatched
    if (sub.dispatched_at) {
      return NextResponse.json({ success: true, message: 'Already dispatched' })
    }

    // Must be active to dispatch
    if (sub.status !== 'active') {
      return NextResponse.json({ error: 'Can only dispatch active subscriptions' }, { status: 400 })
    }

    // Update dispatched_at
    const { error: updateError } = await supabase
      .from('rental_subscriptions')
      .update({ dispatched_at: new Date().toISOString() } as never)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // TODO: Send dispatch notification email to user

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dispatch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
