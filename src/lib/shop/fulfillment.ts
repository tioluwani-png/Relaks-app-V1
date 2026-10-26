import type { SupabaseClient } from '@supabase/supabase-js'
import { sendShopOrderConfirmationEmail, sendShopNewOrderAlertEmail } from './emails'
import { createWalletTransaction } from '@/lib/wallet'
import type { ShopOrder, ShopOrderItem, ShopProduct, ShopProductVariant } from '@/types/database'

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    status: string
    reference: string
    amount: number // In kobo
    currency: string
    metadata?: {
      order_id?: string
      type?: string
    }
  }
}

export interface FulfillmentResult {
  success: boolean
  alreadyProcessed?: boolean
  orderNumber?: string
  estimatedMinDays?: number | null
  estimatedMaxDays?: number | null
  stockWarnings?: string[]
  error?: string
}

/**
 * Verify a Paystack transaction
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Paystack verify failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Idempotent shop order fulfillment
 *
 * This function handles all steps after a successful payment:
 * 1. Mark order as paid
 * 2. Record payment (idempotent via paystack_reference)
 * 3. Decrement stock for each item
 * 4. Create wallet transaction
 * 5. Increment coupon usage
 * 6. Send customer confirmation email
 * 7. Send ops alert email
 *
 * If the order is already paid/fulfilled, returns success with order info.
 * This ensures the customer always sees "Order Confirmed" whether:
 * - They're the first to verify (callback)
 * - The webhook arrived first
 * - They refresh the success page
 */
export async function fulfillShopOrder(
  supabase: SupabaseClient,
  reference: string,
  orderId: string,
  skipPaystackVerify = false,
  paystackAmount?: number // Pass amount if already verified (webhook)
): Promise<FulfillmentResult> {
  const logPrefix = '[fulfillShopOrder]'

  try {
    // 1. Get order from DB
    const { data: orderData, error: orderError } = await supabase
      .from('shop_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !orderData) {
      console.error(`${logPrefix} Order not found:`, orderId, orderError)
      return { success: false, error: 'Order not found' }
    }

    const order = orderData as unknown as ShopOrder

    // 2. Check if already fulfilled - return success with order info
    if (order.status !== 'pending_payment') {
      console.log(`${logPrefix} Order already processed:`, orderId, order.status)
      return {
        success: true,
        alreadyProcessed: true,
        orderNumber: order.order_number,
        estimatedMinDays: order.estimated_min_days,
        estimatedMaxDays: order.estimated_max_days,
      }
    }

    // 3. Check for duplicate payment record (another idempotency check)
    const { data: existingPayment } = await supabase
      .from('shop_payments')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingPayment) {
      // Payment record exists but order status wasn't updated - fix it
      console.log(`${logPrefix} Payment exists but order pending, fixing:`, orderId)
      await supabase
        .from('shop_orders')
        .update({ status: 'paid' } as never)
        .eq('id', orderId)

      return {
        success: true,
        alreadyProcessed: true,
        orderNumber: order.order_number,
        estimatedMinDays: order.estimated_min_days,
        estimatedMaxDays: order.estimated_max_days,
      }
    }

    // 4. Verify with Paystack (unless we're skipping - webhook already verified)
    let paidAmountNaira: number

    if (!skipPaystackVerify) {
      try {
        const paystackResponse = await verifyPaystackTransaction(reference)

        if (!paystackResponse.status || paystackResponse.data.status !== 'success') {
          return { success: false, error: 'Payment not successful' }
        }

        paidAmountNaira = paystackResponse.data.amount / 100

        // Verify amount matches order
        if (paidAmountNaira !== order.total_naira) {
          console.error(
            `${logPrefix} Amount mismatch: paid ${paidAmountNaira}, expected ${order.total_naira}`
          )
          return { success: false, error: 'Payment amount does not match order total' }
        }
      } catch (error) {
        console.error(`${logPrefix} Paystack verify error:`, error)
        return { success: false, error: 'Failed to verify payment with Paystack' }
      }
    } else {
      // Use provided amount from webhook
      paidAmountNaira = paystackAmount ?? order.total_naira
    }

    // 5. Get order items
    const { data: itemsData, error: itemsError } = await supabase
      .from('shop_order_items')
      .select('*')
      .eq('order_id', orderId)

    if (itemsError || !itemsData || itemsData.length === 0) {
      console.error(`${logPrefix} Items query error:`, itemsError)
      return { success: false, error: 'Order items not found' }
    }

    const items = itemsData as unknown as ShopOrderItem[]

    // 6. Atomically decrement stock for each item
    const stockFailures: string[] = []

    for (const item of items) {
      const itemLabel = item.variant_label
        ? `${item.product_name} (${item.variant_label})`
        : item.product_name

      if (item.variant_id) {
        // Get current variant stock
        const { data: variantData } = await supabase
          .from('shop_product_variants')
          .select('stock_quantity')
          .eq('id', item.variant_id)
          .single()

        if (!variantData) {
          stockFailures.push(itemLabel)
          continue
        }

        const variant = variantData as unknown as Pick<ShopProductVariant, 'stock_quantity'>

        // Optimistic lock update
        const { data: updated, error: updateError } = await supabase
          .from('shop_product_variants')
          .update({ stock_quantity: variant.stock_quantity - item.quantity } as never)
          .eq('id', item.variant_id)
          .gte('stock_quantity', item.quantity)
          .select('id')

        if (updateError || !updated || (Array.isArray(updated) && updated.length === 0)) {
          stockFailures.push(itemLabel)
        }
      } else if (item.product_id) {
        // Non-variant item - decrement product stock
        const { data: productData } = await supabase
          .from('shop_products')
          .select('stock_quantity, name')
          .eq('id', item.product_id)
          .single()

        if (!productData) {
          stockFailures.push(itemLabel)
          continue
        }

        const product = productData as unknown as Pick<ShopProduct, 'stock_quantity' | 'name'>

        const { data: updated, error: updateError } = await supabase
          .from('shop_products')
          .update({ stock_quantity: product.stock_quantity - item.quantity } as never)
          .eq('id', item.product_id)
          .gte('stock_quantity', item.quantity)
          .select('id')

        if (updateError || !updated || (Array.isArray(updated) && updated.length === 0)) {
          stockFailures.push(itemLabel)
        }
      }
    }

    // 7. Record payment (idempotent via unique constraint)
    const { error: paymentError } = await supabase.from('shop_payments').insert({
      order_id: orderId,
      amount_naira: paidAmountNaira,
      paystack_reference: reference,
      paystack_status: 'success',
    } as never)

    if (paymentError) {
      // Check if it's a duplicate key error (already processed by concurrent request)
      if (paymentError.code === '23505') {
        console.log(`${logPrefix} Concurrent fulfillment detected:`, orderId)
        return {
          success: true,
          alreadyProcessed: true,
          orderNumber: order.order_number,
          estimatedMinDays: order.estimated_min_days,
          estimatedMaxDays: order.estimated_max_days,
        }
      }
      console.error(`${logPrefix} Payment record error:`, paymentError)
      // Continue anyway - payment was successful with Paystack
    }

    // 8. Update order status to paid
    const { error: statusError } = await supabase
      .from('shop_orders')
      .update({ status: 'paid' } as never)
      .eq('id', orderId)

    if (statusError) {
      console.error(`${logPrefix} Status update error:`, statusError)
    }

    // 9. Create wallet transaction (idempotent via unique paystack_reference)
    const walletResult = await createWalletTransaction(supabase, {
      wallet: 'shop',
      type: 'sale',
      amount: order.total_naira,
      direction: 'credit',
      sourceType: 'shop_order',
      sourceId: orderId,
      paystackReference: reference,
      note: `Order #${order.order_number}`,
    })

    if (!walletResult.success) {
      console.error(`${logPrefix} Wallet entry error:`, walletResult.error)
    }

    // 10. Increment coupon usage atomically (if coupon was used)
    if (order.coupon_id && order.discount_naira > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: incrementError } = await (supabase as any).rpc('increment_coupon_usage', {
          p_coupon_id: order.coupon_id,
          p_discount_amount: order.discount_naira,
        })

        if (incrementError) {
          console.error(`${logPrefix} Coupon increment error:`, incrementError)
        }
      } catch (couponError) {
        console.error(`${logPrefix} Coupon increment failed:`, couponError)
      }
    }

    // 11. Send confirmation email to customer
    try {
      await sendShopOrderConfirmationEmail(
        order.email,
        order.customer_name,
        order.order_number,
        items,
        order.subtotal_naira,
        order.discount_naira,
        order.coupon_code,
        order.delivery_fee_naira,
        order.total_naira,
        order.delivery_address,
        order.delivery_lga,
        order.estimated_min_days,
        order.estimated_max_days
      )
    } catch (emailError) {
      console.error(`${logPrefix} Confirmation email error:`, emailError)
    }

    // 12. Send ops alert
    try {
      await sendShopNewOrderAlertEmail(
        orderId,
        order.order_number,
        order.customer_name,
        order.phone,
        order.email,
        order.delivery_address,
        order.delivery_lga,
        items,
        order.subtotal_naira,
        order.discount_naira,
        order.coupon_code,
        order.delivery_fee_naira,
        order.total_naira,
        reference,
        stockFailures.length > 0 ? stockFailures : undefined
      )
    } catch (emailError) {
      console.error(`${logPrefix} Ops alert error:`, emailError)
    }

    console.log(`${logPrefix} Order fulfilled:`, order.order_number)

    return {
      success: true,
      orderNumber: order.order_number,
      estimatedMinDays: order.estimated_min_days,
      estimatedMaxDays: order.estimated_max_days,
      stockWarnings: stockFailures.length > 0 ? stockFailures : undefined,
    }
  } catch (error) {
    console.error(`${logPrefix} Error:`, error)
    return { success: false, error: 'Internal fulfillment error' }
  }
}

/**
 * Extract order ID from Paystack metadata or reference
 * Metadata is the source of truth; reference is fallback/cross-check
 */
export function extractOrderIdFromReference(reference: string): string | null {
  // Format: shop-{uuid}-{timestamp} or shop_{uuid}_{timestamp}
  const match = reference.match(
    /^shop[-_]([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})[-_]\d+$/
  )
  return match ? match[1] : null
}
