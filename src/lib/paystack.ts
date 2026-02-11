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
