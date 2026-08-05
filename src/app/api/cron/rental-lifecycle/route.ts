/**
 * RENTAL LIFECYCLE CRON
 *
 * Runs daily to handle:
 * 1. 7-day expiry reminders
 * 2. Auto-charge on expiry day (auto_renew = true)
 * 3. Mark expired non-renewers as awaiting_return
 *
 * Protected by CRON_SECRET bearer token
 * Schedule: Daily at 9 AM UTC (vercel.json)
 */

import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  sendRenewalReminderEmail,
  sendAutoRenewalSuccessEmail,
  sendAutoRenewalFailedEmail,
  sendCollectionScheduledEmail,
} from '@/lib/email'
import { chargeAuthorization, generateRenewalReference } from '@/lib/paystack'

interface CronResult {
  reminders: { sent: number; skipped: number; errors: string[] }
  autoRenewals: { success: number; failed: number; errors: string[] }
  expirations: { marked: number; errors: string[] }
}

export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[rental-lifecycle] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const now = new Date()

  const results: CronResult = {
    reminders: { sent: 0, skipped: 0, errors: [] },
    autoRenewals: { success: 0, failed: 0, errors: [] },
    expirations: { marked: 0, errors: [] },
  }

  console.log('[rental-lifecycle] Cron started at:', now.toISOString())

  // ==========================================
  // TASK 1: 7-day expiry reminders
  // ==========================================
  try {
    // Find subscriptions expiring in 6-8 days (to catch 7 days)
    const reminderWindowStart = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
    const reminderWindowEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)

    const { data: reminderSubs, error: reminderError } = await supabase
      .from('rental_subscriptions')
      .select(`
        id,
        user_id,
        expires_at,
        auto_renew,
        plan:rental_plans(price_naira),
        user:users(email, username, display_name)
      `)
      .eq('status', 'delivered')
      .gte('expires_at', reminderWindowStart.toISOString())
      .lte('expires_at', reminderWindowEnd.toISOString())

    if (reminderError) {
      console.error('[rental-lifecycle] Reminder query error:', reminderError)
    }

    for (const sub of reminderSubs || []) {
      const subscription = sub as {
        id: string
        user_id: string
        expires_at: string
        auto_renew: boolean
        plan: { price_naira: number } | null
        user: { email: string; username: string; display_name: string | null } | null
      }

      // Check if reminder already sent
      const { data: existingLog } = await supabase
        .from('rental_email_log')
        .select('id')
        .eq('subscription_id', subscription.id)
        .eq('email_type', 'expiry_reminder')
        .single()

      if (existingLog) {
        results.reminders.skipped++
        continue
      }

      // Send reminder email
      try {
        if (subscription.user && subscription.plan) {
          await sendRenewalReminderEmail(
            subscription.user.email,
            subscription.user.display_name || subscription.user.username,
            subscription.expires_at,
            subscription.auto_renew,
            subscription.plan.price_naira
          )

          // Log the email
          await supabase
            .from('rental_email_log')
            .insert({
              subscription_id: subscription.id,
              email_type: 'expiry_reminder',
            } as never)

          results.reminders.sent++
        }
      } catch (emailError) {
        const errorMsg = `Reminder email failed for ${subscription.id}: ${emailError}`
        console.error('[rental-lifecycle]', errorMsg)
        results.reminders.errors.push(errorMsg)
      }
    }
  } catch (error) {
    console.error('[rental-lifecycle] Task 1 error:', error)
  }

  // ==========================================
  // TASK 2: Auto-charge on expiry day
  // ==========================================
  try {
    // Find subscriptions expiring today with auto_renew enabled
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const { data: autoRenewSubs, error: autoRenewError } = await supabase
      .from('rental_subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        delivery_lga,
        delivery_address,
        delivery_phone,
        plan:rental_plans(id, price_naira, duration_days, books_per_cycle, name),
        user:users(email, username, display_name)
      `)
      .eq('status', 'delivered')
      .eq('auto_renew', true)
      .gte('expires_at', todayStart.toISOString())
      .lte('expires_at', todayEnd.toISOString())

    if (autoRenewError) {
      console.error('[rental-lifecycle] Auto-renew query error:', autoRenewError)
    }

    for (const sub of autoRenewSubs || []) {
      const subscription = sub as {
        id: string
        user_id: string
        plan_id: string
        delivery_lga: string
        delivery_address: string
        delivery_phone: string
        plan: {
          id: string
          price_naira: number
          duration_days: number
          books_per_cycle: number
          name: string
        } | null
        user: { email: string; username: string; display_name: string | null } | null
      }

      // Check if already processed (renewal_receipt logged)
      const { data: existingLog } = await supabase
        .from('rental_email_log')
        .select('id')
        .eq('subscription_id', subscription.id)
        .eq('email_type', 'renewal_receipt')
        .single()

      if (existingLog) {
        continue // Already processed
      }

      // Get saved authorization_code
      const { data: paymentData } = await supabase
        .from('rental_payments')
        .select('authorization_code')
        .eq('subscription_id', subscription.id)
        .eq('paystack_status', 'success')
        .not('authorization_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const payment = paymentData as { authorization_code: string | null } | null

      if (!payment?.authorization_code || !subscription.plan || !subscription.user) {
        const errorMsg = `Missing auth code or data for ${subscription.id}`
        console.error('[rental-lifecycle]', errorMsg)
        results.autoRenewals.errors.push(errorMsg)
        continue
      }

      const authCode = payment.authorization_code
      const amountKobo = subscription.plan.price_naira * 100
      const reference = generateRenewalReference(subscription.id)

      // Charge the card
      const chargeResult = await chargeAuthorization(
        authCode,
        subscription.user.email,
        amountKobo,
        reference,
        {
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          type: 'rental_renewal',
        }
      )

      if (chargeResult.success) {
        // Create new subscription (status: processing, awaiting book selection)
        const { data: newSub, error: newSubError } = await supabase
          .from('rental_subscriptions')
          .insert({
            user_id: subscription.user_id,
            plan_id: subscription.plan_id,
            status: 'active', // Will go through normal fulfillment flow
            delivery_lga: subscription.delivery_lga,
            delivery_address: subscription.delivery_address,
            delivery_phone: subscription.delivery_phone,
            auto_renew: true,
          } as never)
          .select('id')
          .single()

        if (newSubError || !newSub) {
          console.error('[rental-lifecycle] Failed to create renewal subscription:', newSubError)
          results.autoRenewals.errors.push(`Failed to create renewal for ${subscription.id}`)
          continue
        }

        const newSubscription = newSub as { id: string }

        // Record the payment
        await supabase
          .from('rental_payments')
          .insert({
            user_id: subscription.user_id,
            subscription_id: newSubscription.id,
            plan_id: subscription.plan_id,
            amount_naira: subscription.plan.price_naira,
            paystack_reference: reference,
            paystack_status: 'success',
            authorization_code: chargeResult.data?.authorization?.authorization_code || authCode,
          } as never)

        // Update old subscription to awaiting_return
        await supabase
          .from('rental_subscriptions')
          .update({ status: 'awaiting_return' } as never)
          .eq('id', subscription.id)

        // Calculate new expires date
        const newExpiresAt = new Date(now.getTime() + subscription.plan.duration_days * 24 * 60 * 60 * 1000)

        // Send success email
        try {
          await sendAutoRenewalSuccessEmail(
            subscription.user.email,
            subscription.user.display_name || subscription.user.username,
            subscription.plan.name,
            subscription.plan.price_naira,
            newExpiresAt.toISOString(),
            newSubscription.id
          )

          // Log the email
          await supabase
            .from('rental_email_log')
            .insert({
              subscription_id: subscription.id,
              email_type: 'renewal_receipt',
            } as never)
        } catch (emailError) {
          console.error('[rental-lifecycle] Renewal email error:', emailError)
        }

        results.autoRenewals.success++
        console.log('[rental-lifecycle] Auto-renewal successful:', {
          oldId: subscription.id,
          newId: newSubscription.id,
          reference,
        })
      } else {
        // Charge failed - send failure email
        try {
          // Check if failure email already sent
          const { data: failLog } = await supabase
            .from('rental_email_log')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('email_type', 'renewal_failed')
            .single()

          if (!failLog) {
            await sendAutoRenewalFailedEmail(
              subscription.user.email,
              subscription.user.display_name || subscription.user.username,
              subscription.plan.name,
              subscription.plan.price_naira,
              subscription.id
            )

            await supabase
              .from('rental_email_log')
              .insert({
                subscription_id: subscription.id,
                email_type: 'renewal_failed',
              } as never)
          }
        } catch (emailError) {
          console.error('[rental-lifecycle] Failure email error:', emailError)
        }

        results.autoRenewals.failed++
        results.autoRenewals.errors.push(`Charge failed for ${subscription.id}: ${chargeResult.error}`)
      }
    }
  } catch (error) {
    console.error('[rental-lifecycle] Task 2 error:', error)
  }

  // ==========================================
  // TASK 3: Mark expired non-renewers as awaiting_return
  // ==========================================
  try {
    // Find subscriptions that have expired, auto_renew=false, still delivered
    const { data: expiredSubs, error: expiredError } = await supabase
      .from('rental_subscriptions')
      .select(`
        id,
        user_id,
        user:users(email, username, display_name)
      `)
      .eq('status', 'delivered')
      .eq('auto_renew', false)
      .lte('expires_at', now.toISOString())

    if (expiredError) {
      console.error('[rental-lifecycle] Expiration query error:', expiredError)
    }

    for (const sub of expiredSubs || []) {
      const subscription = sub as {
        id: string
        user_id: string
        user: { email: string; username: string; display_name: string | null } | null
      }

      // Check if collection email already sent
      const { data: existingLog } = await supabase
        .from('rental_email_log')
        .select('id')
        .eq('subscription_id', subscription.id)
        .eq('email_type', 'collection_scheduled')
        .single()

      if (existingLog) {
        continue // Already processed
      }

      // Update status
      const { error: updateError } = await supabase
        .from('rental_subscriptions')
        .update({ status: 'awaiting_return' } as never)
        .eq('id', subscription.id)

      if (updateError) {
        const errorMsg = `Failed to mark ${subscription.id} as awaiting_return: ${updateError.message}`
        console.error('[rental-lifecycle]', errorMsg)
        results.expirations.errors.push(errorMsg)
        continue
      }

      // Send collection scheduled email
      try {
        if (subscription.user) {
          await sendCollectionScheduledEmail(
            subscription.user.email,
            subscription.user.display_name || subscription.user.username
          )

          // Log the email
          await supabase
            .from('rental_email_log')
            .insert({
              subscription_id: subscription.id,
              email_type: 'collection_scheduled',
            } as never)
        }
      } catch (emailError) {
        console.error('[rental-lifecycle] Collection email error:', emailError)
      }

      results.expirations.marked++
    }
  } catch (error) {
    console.error('[rental-lifecycle] Task 3 error:', error)
  }

  console.log('[rental-lifecycle] Cron completed:', results)

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    results,
  })
}
