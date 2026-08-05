const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!

export interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number
    currency: string
    customer: {
      email: string
    }
    metadata: Record<string, unknown>
  }
}

export async function initializePayment(
  email: string,
  amount: number, // in kobo (1 Naira = 100 kobo)
  reference: string,
  metadata: Record<string, unknown> = {},
  callbackUrl?: string
): Promise<PaystackInitializeResponse> {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount,
      reference,
      metadata,
      callback_url: callbackUrl,
    }),
  })

  return response.json()
}

export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  return response.json()
}

export function generateReference(): string {
  return `REL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Pricing in Naira
export const PRICING = {
  singlePage: 500,
  bundle10: 4000, // 20% off
  unlimited: 15000,
  aiStarter: 500,     // 5 credits (1 generation)
  aiPopular: 2000,    // 25 credits (5 generations) - 20% off
  aiPro: 3500,        // 50 credits (10 generations) - 30% off
}

// Convert to kobo for Paystack
export function toKobo(naira: number): number {
  return naira * 100
}

// ============================================
// CHARGE AUTHORIZATION (Recurring Payments)
// ============================================

export interface ChargeAuthorizationResponse {
  status: boolean
  message: string
  data: {
    status: 'success' | 'failed' | 'pending'
    reference: string
    amount: number
    transaction_date: string
    authorization: {
      authorization_code: string
      card_type: string
      last4: string
      exp_month: string
      exp_year: string
      bank: string
    }
  }
}

/**
 * Charge a saved card using authorization_code
 * Used for auto-renewal of rental subscriptions
 *
 * @param authorizationCode - The authorization code from a previous successful payment
 * @param email - Customer email (must match the original payment)
 * @param amountKobo - Amount in kobo (Naira * 100)
 * @param reference - Unique reference for this charge
 * @param metadata - Optional metadata to attach to the transaction
 */
export async function chargeAuthorization(
  authorizationCode: string,
  email: string,
  amountKobo: number,
  reference: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: ChargeAuthorizationResponse['data']; error?: string }> {
  try {
    const response = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_code: authorizationCode,
        email,
        amount: amountKobo,
        reference,
        metadata,
      }),
    })

    const result: ChargeAuthorizationResponse = await response.json()

    if (!result.status) {
      console.error('[chargeAuthorization] Paystack error:', result.message)
      return { success: false, error: result.message }
    }

    if (result.data.status !== 'success') {
      console.error('[chargeAuthorization] Charge failed:', result.data.status)
      return { success: false, error: `Charge ${result.data.status}` }
    }

    console.log('[chargeAuthorization] Charge successful:', {
      reference: result.data.reference,
      amount: result.data.amount,
    })

    return { success: true, data: result.data }
  } catch (error) {
    console.error('[chargeAuthorization] Error:', error)
    return { success: false, error: 'Failed to charge card' }
  }
}

/**
 * Generate a reference for auto-renewal charges
 */
export function generateRenewalReference(subscriptionId: string): string {
  return `renewal_${subscriptionId}_${Date.now()}`
}
