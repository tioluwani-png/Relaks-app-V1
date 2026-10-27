import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ShopOrderStatus } from '@/lib/shop/config'
import {
  sendShopOrderProcessingEmail,
  sendShopOrderDispatchedEmail,
  sendShopOrderDeliveredEmail,
  sendShopOpsAlertEmail,
} from '@/lib/shop/emails'
import type { ShopOrder, ShopOrderItem, ShopDeliveryZone } from '@/types/database'

interface OrderWithDetails extends ShopOrder {
  items: ShopOrderItem[]
  zone: ShopDeliveryZone | null
}

type EmailType = 'processing' | 'dispatched' | 'delivered'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const { status, sendProcessingEmail } = await request.json() as {
      status: ShopOrderStatus
      sendProcessingEmail?: boolean
    }

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (userData as { role: string } | null)?.role
    if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = await createAdminClient()

    // Get order with items and zone
    const { data: order, error: orderError } = await adminClient
      .from('shop_orders')
      .select(`
        *,
        items:shop_order_items(*),
        zone:shop_delivery_zones(*)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const orderData = order as unknown as OrderWithDetails

    // Check if this email was already sent (prevent duplicates)
    const emailType = getEmailTypeForStatus(status)
    if (emailType) {
      const { data: existingEmail } = await adminClient
        .from('shop_order_emails')
        .select('id')
        .eq('order_id', orderId)
        .eq('email_type', emailType)
        .maybeSingle()

      if (existingEmail) {
        // Email already sent for this status, just update status without resending
        const updates = buildStatusUpdates(status)
        await adminClient
          .from('shop_orders')
          .update(updates as never)
          .eq('id', orderId)

        return NextResponse.json({
          success: true,
          emailSkipped: true,
          message: `Status updated. ${emailType} email was already sent.`,
        })
      }
    }

    // Build status updates
    const updates = buildStatusUpdates(status)

    // Update order status
    const { error: updateError } = await adminClient
      .from('shop_orders')
      .update(updates as never)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    // Send appropriate email
    let emailResult: { success: boolean; error?: unknown } = { success: true }
    let emailSent = false

    if (status === 'processing' && sendProcessingEmail) {
      emailResult = await sendShopOrderProcessingEmail(
        orderData.email,
        orderData.customer_name,
        orderData.order_number,
        orderData.items
      )
      if (emailResult.success) emailSent = true
    } else if (status === 'dispatched') {
      emailResult = await sendShopOrderDispatchedEmail(
        orderData.email,
        orderData.customer_name,
        orderData.order_number,
        orderData.items,
        orderData.estimated_min_days,
        orderData.estimated_max_days
      )
      if (emailResult.success) emailSent = true
    } else if (status === 'delivered') {
      emailResult = await sendShopOrderDeliveredEmail(
        orderData.email,
        orderData.customer_name,
        orderData.order_number,
        orderData.items
      )
      if (emailResult.success) emailSent = true
    }

    // Record email if sent
    if (emailSent && emailType) {
      await adminClient
        .from('shop_order_emails')
        .insert({
          order_id: orderId,
          email_type: emailType,
          sent_to: orderData.email,
          sent_by: user.id,
        } as never)
    }

    // If email failed, log it and send ops alert
    if (emailType && !emailResult.success) {
      console.error(`[OrderStatus] Failed to send ${emailType} email for order ${orderData.order_number}:`, emailResult.error)

      // Send ops alert about the failure
      await sendShopOpsAlertEmail(
        `⚠️ Email failed for order #${orderData.order_number}`,
        `The ${emailType} email failed to send to ${orderData.email}.\n\nOrder: #${orderData.order_number}\nCustomer: ${orderData.customer_name}\nError: ${JSON.stringify(emailResult.error)}\n\nPlease resend manually from the admin panel.`
      )
    }

    // Handle stock restoration for cancelled orders
    if (status === 'cancelled' && orderData.status !== 'pending_payment') {
      for (const item of orderData.items) {
        if (item.product_id) {
          const { data: productData } = await adminClient
            .from('shop_products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single()

          if (productData) {
            const currentStock = (productData as { stock_quantity: number }).stock_quantity || 0
            await adminClient
              .from('shop_products')
              .update({ stock_quantity: currentStock + item.quantity } as never)
              .eq('id', item.product_id)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      emailFailed: emailType && !emailResult.success,
    })
  } catch (error) {
    console.error('[OrderStatus] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getEmailTypeForStatus(status: ShopOrderStatus): EmailType | null {
  switch (status) {
    case 'processing':
      return 'processing'
    case 'dispatched':
      return 'dispatched'
    case 'delivered':
      return 'delivered'
    default:
      return null
  }
}

function buildStatusUpdates(status: ShopOrderStatus): Partial<ShopOrder> {
  const updates: Partial<ShopOrder> = { status }

  if (status === 'dispatched') {
    updates.dispatched_at = new Date().toISOString()
  } else if (status === 'delivered') {
    updates.delivered_at = new Date().toISOString()
  } else if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  }

  return updates
}
