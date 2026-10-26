import type { SupabaseClient } from '@supabase/supabase-js'
import { createWalletTransaction } from '@/lib/wallet'

export interface RentalFulfillmentResult {
  success: boolean
  alreadyProcessed?: boolean
  subscriptionId?: string
  walletError?: string
  error?: string
}

/**
 * Create wallet entry for a rental payment
 *
 * This is idempotent - if the wallet entry already exists (by paystack_reference),
 * it will be skipped. Call this from both:
 * - /api/rental/payments/verify (callback)
 * - /api/payments/webhook (rental branch)
 *
 * The rental verify route handles all the other fulfillment (subscription status,
 * book stock, emails) - this function ONLY handles the wallet entry.
 */
export async function createRentalWalletEntry(
  supabase: SupabaseClient,
  params: {
    subscriptionId: string
    planName: string
    priceNaira: number
    paystackReference: string
  }
): Promise<{ success: boolean; error?: string }> {
  const logPrefix = '[createRentalWalletEntry]'

  try {
    const result = await createWalletTransaction(supabase, {
      wallet: 'reading_club',
      type: 'sale',
      amount: params.priceNaira,
      direction: 'credit',
      sourceType: 'rental',
      sourceId: params.subscriptionId,
      paystackReference: params.paystackReference,
      note: `${params.planName} rental - ${params.subscriptionId.slice(0, 8)}`,
    })

    if (!result.success) {
      console.error(`${logPrefix} Wallet entry error:`, result.error)
      return { success: false, error: result.error }
    }

    console.log(`${logPrefix} Wallet entry created:`, params.subscriptionId)
    return { success: true }
  } catch (error) {
    console.error(`${logPrefix} Exception:`, error)
    return { success: false, error: 'Failed to create wallet entry' }
  }
}

/**
 * Lightweight rental fulfillment for webhook
 *
 * The webhook arrives with subscription_id but the full fulfillment
 * (subscription status, book stock, emails) is handled by the verify route.
 *
 * This function:
 * 1. Checks if payment already recorded
 * 2. Creates wallet entry (idempotent)
 * 3. Returns success
 *
 * If the verify route runs first, this becomes a no-op (already processed).
 * If the webhook runs first, this creates the wallet entry, and verify
 * will still run the rest of the fulfillment.
 */
export async function fulfillRentalFromWebhook(
  supabase: SupabaseClient,
  subscriptionId: string,
  reference: string,
  amountNaira: number
): Promise<RentalFulfillmentResult> {
  const logPrefix = '[fulfillRentalFromWebhook]'

  try {
    // 1. Check if payment already recorded
    const { data: existingPayment } = await supabase
      .from('rental_payments')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingPayment) {
      console.log(`${logPrefix} Payment already recorded, checking wallet:`, reference)
      // Payment exists, but wallet entry might be missing - try to create it
    }

    // 2. Get subscription with plan for wallet entry
    const { data: subData, error: subError } = await supabase
      .from('rental_subscriptions')
      .select(`
        id,
        plan:rental_plans(name, price_naira)
      `)
      .eq('id', subscriptionId)
      .single()

    if (subError || !subData) {
      console.error(`${logPrefix} Subscription not found:`, subscriptionId)
      return { success: false, error: 'Subscription not found' }
    }

    const subscription = subData as unknown as {
      id: string
      plan: { name: string; price_naira: number } | null
    }

    const planName = subscription.plan?.name || 'Rental'
    const priceNaira = subscription.plan?.price_naira || amountNaira

    // 3. Create wallet entry (idempotent)
    const walletResult = await createRentalWalletEntry(supabase, {
      subscriptionId,
      planName,
      priceNaira,
      paystackReference: reference,
    })

    if (!walletResult.success) {
      // Log but don't fail - payment might still be valid
      console.error(`${logPrefix} Wallet entry failed:`, walletResult.error)
      return {
        success: true, // Payment is valid, just wallet failed
        subscriptionId,
        walletError: walletResult.error,
      }
    }

    return {
      success: true,
      alreadyProcessed: !!existingPayment,
      subscriptionId,
    }
  } catch (error) {
    console.error(`${logPrefix} Error:`, error)
    return { success: false, error: 'Rental fulfillment error' }
  }
}
