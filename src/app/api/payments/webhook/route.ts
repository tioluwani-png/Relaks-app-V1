import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature
    const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const { data } = event
    const { reference, metadata, amount } = data
    const { user_id, type, page_id } = metadata

    const supabase = await createAdminClient()

    // Record the purchase
    await supabase.from('purchases').insert({
      user_id,
      page_id: page_id || null,
      type,
      amount_naira: amount / 100,
      paystack_reference: reference,
    } as never)

    // Handle different purchase types - update user credits
    // Note: In production, use database functions for atomic increments
    const { data: userData } = await supabase
      .from('users')
      .select('free_pages_remaining, ai_credits')
      .eq('id', user_id)
      .single()

    const userDataTyped = userData as { free_pages_remaining: number; ai_credits: number } | null

    switch (type) {
      case 'bundle':
        if (userDataTyped) {
          await supabase.from('users').update({
            free_pages_remaining: userDataTyped.free_pages_remaining + 10,
          } as never).eq('id', user_id)
        }
        break

      case 'ai_starter':
        if (userDataTyped) {
          await supabase.from('users').update({
            ai_credits: userDataTyped.ai_credits + 5,
          } as never).eq('id', user_id)
        }
        break

      case 'ai_popular':
        if (userDataTyped) {
          await supabase.from('users').update({
            ai_credits: userDataTyped.ai_credits + 25,
          } as never).eq('id', user_id)
        }
        break

      case 'ai_pro':
        if (userDataTyped) {
          await supabase.from('users').update({
            ai_credits: userDataTyped.ai_credits + 50,
          } as never).eq('id', user_id)
        }
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
