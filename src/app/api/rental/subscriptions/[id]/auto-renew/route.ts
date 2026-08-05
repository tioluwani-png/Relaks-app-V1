import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const autoRenewSchema = z.object({
  autoRenew: z.boolean(),
})

/**
 * PATCH /api/rental/subscriptions/[id]/auto-renew
 * Toggle auto-renew for a subscription
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: subscriptionId } = await params
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = autoRenewSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { autoRenew } = validation.data

    // Verify the subscription belongs to the user
    const { data: subscription, error: subError } = await supabase
      .from('rental_subscriptions')
      .select('id, user_id, status')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const sub = subscription as { id: string; user_id: string; status: string }

    // Only allow toggling for active subscriptions (delivered)
    if (!['active', 'processing', 'picked_up', 'in_transit', 'delivered'].includes(sub.status)) {
      return NextResponse.json(
        { error: 'Cannot toggle auto-renew for this subscription status' },
        { status: 400 }
      )
    }

    // If enabling auto-renew, verify they have a saved payment method
    if (autoRenew) {
      const { data: paymentData } = await supabase
        .from('rental_payments')
        .select('authorization_code')
        .eq('subscription_id', subscriptionId)
        .eq('paystack_status', 'success')
        .not('authorization_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const payment = paymentData as { authorization_code: string | null } | null

      if (!payment?.authorization_code) {
        return NextResponse.json(
          { error: 'No saved payment method found. Please make a new payment first.' },
          { status: 400 }
        )
      }
    }

    // Update auto_renew
    const { error: updateError } = await supabase
      .from('rental_subscriptions')
      .update({ auto_renew: autoRenew } as never)
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('[auto-renew] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    console.log('[auto-renew] Updated:', { subscriptionId, autoRenew })

    return NextResponse.json({ success: true, autoRenew })
  } catch (error) {
    console.error('[auto-renew] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
