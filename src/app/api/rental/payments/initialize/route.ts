import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initializePayment, toKobo } from '@/lib/paystack'

const initializeSchema = z.object({
  subscriptionId: z.string().uuid(),
})

interface RentalSubscription {
  id: string
  user_id: string
  status: string
  plan: {
    id: string
    name: string
    price_naira: number
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth required for rental
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = initializeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { subscriptionId } = validation.data

    const adminSupabase = await createAdminClient()

    // Get subscription with plan
    const { data: subscriptionData, error: subError } = await adminSupabase
      .from('rental_subscriptions')
      .select(`
        id,
        user_id,
        status,
        plan:rental_plans(id, name, price_naira)
      `)
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .eq('status', 'pending_payment')
      .single()

    if (subError || !subscriptionData) {
      console.error('[rental/payments/initialize] Subscription not found:', {
        subscriptionId,
        userId: user.id,
        error: subError,
      })
      return NextResponse.json(
        { error: 'Subscription not found or not awaiting payment' },
        { status: 404 }
      )
    }

    const subscription = subscriptionData as unknown as RentalSubscription
    const plan = subscription.plan

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Generate reference
    const reference = `rental-${subscriptionId}-${Date.now()}`
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rent/payment/callback`

    // Initialize with Paystack
    const result = await initializePayment(
      user.email!,
      toKobo(plan.price_naira),
      reference,
      {
        subscription_id: subscriptionId,
        plan_id: plan.id,
        plan_name: plan.name,
        type: 'rental',
        user_id: user.id,
      },
      callbackUrl
    )

    if (!result.status) {
      console.error('[rental/payments/initialize] Paystack error:', result.message)
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    })
  } catch (error) {
    console.error('[rental/payments/initialize] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
