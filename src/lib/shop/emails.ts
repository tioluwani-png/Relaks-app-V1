import { Resend } from 'resend'
import type { ShopOrderItem } from '@/types/database'

const FROM_EMAIL = 'Relaks <hello@hello.relaks.co>'

let resendClient: Resend | null = null

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

/**
 * Send order confirmation to customer
 */
export async function sendShopOrderConfirmationEmail(
  to: string,
  customerName: string,
  orderNumber: string,
  items: ShopOrderItem[],
  subtotal: number,
  deliveryFee: number,
  total: number,
  deliveryAddress: string,
  deliveryLga: string
) {
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          ${item.product_name} × ${item.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
          ₦${(item.unit_price_naira * item.quantity).toLocaleString()}
        </td>
      </tr>
    `
    )
    .join('')

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Order confirmed! #${orderNumber}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Thanks for your order!</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${customerName}, your order <strong>#${orderNumber}</strong> is confirmed. We're getting it ready!
          </p>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
              <tr>
                <td style="padding: 12px 0; color: #6b7280;">Subtotal</td>
                <td style="padding: 12px 0; text-align: right; color: #6b7280;">₦${subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280;">Delivery</td>
                <td style="padding: 12px 0; text-align: right; color: #6b7280;">₦${deliveryFee.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: #1f2937;">Total</td>
                <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #1f2937;">₦${total.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #f3f4f6;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Delivering to:</p>
            <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0;">
              ${deliveryAddress}
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">
              ${deliveryLga}, Lagos
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #faf5ff, #fdf2f8); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #4b5563; font-size: 15px; margin: 0;">
              📦 We'll text you when your order is on the way!
            </p>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            Questions? Just reply to this email.<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendShopOrderConfirmationEmail] Error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[sendShopOrderConfirmationEmail] Error:', error)
    return { success: false, error }
  }
}

/**
 * Send new order alert to ops team
 */
export async function sendShopNewOrderAlertEmail(
  orderId: string,
  orderNumber: string,
  customerName: string,
  phone: string,
  email: string,
  deliveryAddress: string,
  deliveryLga: string,
  items: ShopOrderItem[],
  subtotal: number,
  deliveryFee: number,
  total: number,
  paymentReference: string,
  stockWarnings?: string[]
) {
  const opsEmailsRaw = process.env.SHOP_OPS_EMAILS

  if (!opsEmailsRaw || opsEmailsRaw.trim() === '') {
    console.warn('[sendShopNewOrderAlertEmail] SHOP_OPS_EMAILS not set - skipping')
    return { success: false, skipped: true }
  }

  const opsEmails = opsEmailsRaw
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes('@'))

  if (opsEmails.length === 0) {
    return { success: false, skipped: true }
  }

  const orderTime = new Date().toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const itemsList = items.map((i) => `• ${i.product_name} × ${i.quantity}`).join('\n')
  const orderUrl = `https://relaks.co/admin/shop/orders/${orderId}`

  const stockWarningHtml = stockWarnings?.length
    ? `
      <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <strong style="color: #dc2626;">⚠️ Stock Warning:</strong>
        <p style="margin: 8px 0 0 0; color: #7f1d1d;">
          Stock decrement failed for: ${stockWarnings.join(', ')}<br>
          Please check inventory manually.
        </p>
      </div>
    `
    : ''

  const plainText = `
NEW SHOP ORDER
==============

Order: #${orderNumber}
Customer: ${customerName}
Phone: ${phone}
Email: ${email}

DELIVERY
--------
${deliveryAddress}
${deliveryLga.toUpperCase()}, LAGOS

ITEMS:
${itemsList}

Subtotal: ₦${subtotal.toLocaleString()}
Delivery: ₦${deliveryFee.toLocaleString()}
TOTAL: ₦${total.toLocaleString()}

Order Time: ${orderTime}
Payment Ref: ${paymentReference}
${stockWarnings?.length ? `\n⚠️ STOCK WARNING: Check ${stockWarnings.join(', ')}` : ''}

View Order: ${orderUrl}
`.trim()

  try {
    const { data, error } = await getResend().emails.send({
      from: 'Relaks Shop <hello@hello.relaks.co>',
      to: opsEmails,
      subject: `🛍️ New shop order #${orderNumber} — ${customerName} (${deliveryLga})`,
      text: plainText,
      html: `
        <div style="font-family: monospace; font-size: 14px; line-height: 1.6; max-width: 500px; padding: 16px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px;">🛍️ NEW SHOP ORDER</h2>

          ${stockWarningHtml}

          <p style="margin: 0;"><strong>Order:</strong> #${orderNumber}</p>
          <p style="margin: 0;"><strong>Customer:</strong> ${customerName}</p>
          <p style="margin: 0;"><strong>Phone:</strong> ${phone}</p>
          <p style="margin: 0;"><strong>Email:</strong> ${email}</p>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <p style="margin: 0; font-size: 12px; color: #666;">DELIVERY</p>
          <p style="margin: 4px 0; font-size: 16px;"><strong>${deliveryAddress}</strong></p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #c05621;">${deliveryLga.toUpperCase()}</p>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">ITEMS:</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${items.map((i) => `<li>${i.product_name} × ${i.quantity}</li>`).join('')}
          </ul>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <p style="margin: 0;">Subtotal: ₦${subtotal.toLocaleString()}</p>
          <p style="margin: 0;">Delivery: ₦${deliveryFee.toLocaleString()}</p>
          <p style="margin: 8px 0 0 0; font-size: 18px;"><strong>Total: ₦${total.toLocaleString()}</strong></p>

          <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;" />

          <p style="margin: 0; font-size: 12px; color: #666;">Order Time: ${orderTime}</p>
          <p style="margin: 0; font-size: 12px; color: #666;">Ref: ${paymentReference}</p>

          <p style="margin: 20px 0;">
            <a href="${orderUrl}" style="background: #c05621; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Order
            </a>
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendShopNewOrderAlertEmail] Error:', error)
      return { success: false, error }
    }

    console.log('[sendShopNewOrderAlertEmail] Sent to:', opsEmails.join(', '))
    return { success: true, data }
  } catch (error) {
    console.error('[sendShopNewOrderAlertEmail] Error:', error)
    return { success: false, error }
  }
}

/**
 * Send dispatch notification to customer
 */
export async function sendShopOrderDispatchedEmail(
  to: string,
  customerName: string,
  orderNumber: string
) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your order is on the way! #${orderNumber}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFBF5;">
          <h1 style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin-bottom: 24px;">
            Relaks
          </h1>

          <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Your order is on the way! 🚚</h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
            Hey ${customerName}, great news! Your order <strong>#${orderNumber}</strong> has been dispatched and is heading your way.
          </p>

          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #065f46; font-size: 15px; margin: 0;">
              📦 Our delivery partner will reach out to confirm delivery. Please keep your phone handy!
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://relaks.co/orders" style="background: linear-gradient(135deg, #A855F7, #EC4899, #F97316); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
              View Order
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px;">
            Questions? Just reply to this email.<br>
            The Relaks Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[sendShopOrderDispatchedEmail] Error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[sendShopOrderDispatchedEmail] Error:', error)
    return { success: false, error }
  }
}
