import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { PRICING, toKobo } from '@/lib/paystack'
import { sendPurchaseEmail, handleFirstPurchase } from '@/lib/email'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

// Expected amounts in kobo for each purchase type
const EXPECTED_AMOUNTS: Record<string, number> = {
  single: toKobo(PRICING.singlePage),
  bundle: toKobo(PRICING.bundle10),
  unlimited: toKobo(PRICING.unlimited),
  ai_starter: toKobo(PRICING.aiStarter),
  ai_popular: toKobo(PRICING.aiPopular),
  ai_pro: toKobo(PRICING.aiPro),
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // 1. Verify webhook signature (HMAC-SHA512)
    const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('Webhook signature mismatch')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    // 2. Only process successful charges
    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const { data } = event
    const { reference, metadata, amount } = data
    const { user_id, type, page_id } = metadata

    // 3. Validate metadata exists
    if (!user_id || !type) {
      console.error('Webhook missing metadata:', { reference, metadata })
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
    }

    // 4. Verify amount matches expected price
    const expectedAmount = EXPECTED_AMOUNTS[type]
    if (expectedAmount && amount !== expectedAmount) {
      console.error('Amount mismatch!', {
        expected: expectedAmount,
        actual: amount,
        reference,
        userId: user_id,
        type,
      })
      return NextResponse.json({ error: 'Amount verification failed' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 5. Check if this payment was already processed (prevent double-spend)
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingPurchase) {
      console.log('Duplicate webhook for reference:', reference)
      return NextResponse.json({ received: true })
    }

    // 6. Record the purchase
    const { error: purchaseError } = await supabase.from('purchases').insert({
      user_id,
      page_id: page_id || null,
      type,
      amount_naira: amount / 100,
      paystack_reference: reference,
    } as never)

    if (purchaseError) {
      console.error('Failed to record purchase:', purchaseError)
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
    }

    // 7. Update user credits/pages based on purchase type
    const { data: userData } = await supabase
      .from('users')
      .select('free_pages_remaining, ai_credits, email, username')
      .eq('id', user_id)
      .single()

    const userDataTyped = userData as { free_pages_remaining: number; ai_credits: number; email: string; username: string } | null

    if (!userDataTyped) {
      console.error('User not found for credit update:', user_id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    switch (type) {
      case 'bundle':
        await supabase.from('users').update({
          free_pages_remaining: userDataTyped.free_pages_remaining + 10,
        } as never).eq('id', user_id)
        break

      case 'ai_starter':
        await supabase.from('users').update({
          ai_credits: userDataTyped.ai_credits + 5,
        } as never).eq('id', user_id)
        break

      case 'ai_popular':
        await supabase.from('users').update({
          ai_credits: userDataTyped.ai_credits + 25,
        } as never).eq('id', user_id)
        break

      case 'ai_pro':
        await supabase.from('users').update({
          ai_credits: userDataTyped.ai_credits + 50,
        } as never).eq('id', user_id)
        break
    }

    console.log('Payment processed:', { reference, userId: user_id, type, amount })

    // 8. Send purchase confirmation email (non-blocking)
    if (userDataTyped.email) {
      sendPurchaseEmail(
        userDataTyped.email,
        userDataTyped.username || 'there',
        type,
        amount / 100,
        reference
      ).catch(err => console.error('Purchase email error:', err))

      // Check if this is their first purchase - tag in Mailchimp
      const { count } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)

      if (count === 1) {
        handleFirstPurchase(userDataTyped.email).catch(err =>
          console.error('First purchase tag error:', err)
        )
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
