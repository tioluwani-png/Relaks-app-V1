import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  sendShopOrderProcessingEmail,
  sendShopOrderDispatchedEmail,
  sendShopOrderDeliveredEmail,
} from '@/lib/shop/emails'
import type { ShopOrder, ShopOrderItem } from '@/types/database'

type EmailType = 'processing' | 'dispatched' | 'delivered'

interface OrderWithItems extends ShopOrder {
  items: ShopOrderItem[]
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const { emailType } = await request.json() as { emailType: EmailType }

    if (!['processing', 'dispatched', 'delivered'].includes(emailType)) {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
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

    // Get order with items
    const { data: order, error: orderError } = await adminClient
      .from('shop_orders')
      .select(`
        *,
        items:shop_order_items(*)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const orderData = order as unknown as OrderWithItems

    // Send the email
    let emailResult: { success: boolean; error?: unknown }

    switch (emailType) {
      case 'processing':
        emailResult = await sendShopOrderProcessingEmail(
          orderData.email,
          orderData.customer_name,
          orderData.order_number,
          orderData.items
        )
        break
      case 'dispatched':
        emailResult = await sendShopOrderDispatchedEmail(
          orderData.email,
          orderData.customer_name,
          orderData.order_number,
          orderData.items,
          orderData.estimated_min_days,
          orderData.estimated_max_days
        )
        break
      case 'delivered':
        emailResult = await sendShopOrderDeliveredEmail(
          orderData.email,
          orderData.customer_name,
          orderData.order_number,
          orderData.items
        )
        break
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    if (!emailResult.success) {
      console.error(`[ResendEmail] Failed to send ${emailType} email:`, emailResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
      }, { status: 500 })
    }

    // Record the resend
    await adminClient
      .from('shop_order_emails')
      .insert({
        order_id: orderId,
        email_type: emailType,
        sent_to: orderData.email,
        sent_by: user.id,
        is_resend: true,
      } as never)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ResendEmail] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
