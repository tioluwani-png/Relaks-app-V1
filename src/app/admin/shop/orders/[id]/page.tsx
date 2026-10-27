'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Package,
  Copy,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  PlayCircle,
  Tag,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type ShopOrderStatus } from '@/lib/shop/config'
import type { ShopOrder, ShopOrderItem, ShopDeliveryZone, ShopPayment } from '@/types/database'
import { cn } from '@/lib/utils'

interface ShopOrderEmail {
  id: string
  order_id: string
  email_type: 'processing' | 'dispatched' | 'delivered'
  sent_to: string
  sent_at: string
  sent_by: string | null
  is_resend: boolean
}

interface OrderWithDetails extends ShopOrder {
  items: ShopOrderItem[]
  zone: ShopDeliveryZone | null
  payment: ShopPayment | null
  emails?: ShopOrderEmail[]
}

export default function AdminShopOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const supabase = createClient()

  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sendProcessingEmail, setSendProcessingEmail] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    loadOrder()
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrder = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('shop_orders')
        .select(`
          *,
          items:shop_order_items(*),
          zone:shop_delivery_zones(*)
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error

      // Get payment
      const { data: payment } = await supabase
        .from('shop_payments')
        .select('*')
        .eq('order_id', orderId)
        .single()

      // Get emails sent for this order
      const { data: emails } = await supabase
        .from('shop_order_emails')
        .select('*')
        .eq('order_id', orderId)
        .order('sent_at', { ascending: false })

      const orderData = data as unknown as OrderWithDetails
      orderData.payment = payment as ShopPayment | null
      orderData.emails = (emails as ShopOrderEmail[] | null) ?? []
      setOrder(orderData)
    } catch (error) {
      console.error('Failed to load order:', error)
      toast.error('Failed to load order')
      router.push('/admin/shop/orders')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (newStatus: ShopOrderStatus) => {
    if (!order) return

    setActionLoading(newStatus)
    try {
      const response = await fetch(`/api/admin/shop/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          sendProcessingEmail: newStatus === 'processing' ? sendProcessingEmail : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order')
      }

      // Show appropriate message
      if (result.emailSkipped) {
        toast.success(`Order marked as ${ORDER_STATUS_LABELS[newStatus]}`, {
          description: 'Email was already sent for this status.',
        })
      } else if (result.emailFailed) {
        toast.warning(`Order marked as ${ORDER_STATUS_LABELS[newStatus]}`, {
          description: 'Email failed to send. You can resend it below.',
        })
      } else if (result.emailSent) {
        toast.success(`Order marked as ${ORDER_STATUS_LABELS[newStatus]}`, {
          description: 'Customer has been notified by email.',
        })
      } else {
        toast.success(`Order marked as ${ORDER_STATUS_LABELS[newStatus]}`)
      }

      if (newStatus === 'cancelled' && order.status !== 'pending_payment') {
        toast.info('Stock has been restored')
      }

      loadOrder()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update order')
    } finally {
      setActionLoading(null)
    }
  }

  const resendEmail = async (emailType: 'processing' | 'dispatched' | 'delivered') => {
    if (!order) return

    setResendLoading(true)
    try {
      const response = await fetch(`/api/admin/shop/orders/${orderId}/resend-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend email')
      }

      toast.success('Email sent successfully')
      loadOrder()
    } catch (error) {
      console.error('Resend error:', error)
      toast.error('Failed to resend email')
    } finally {
      setResendLoading(false)
    }
  }

  const copyOrderBrief = () => {
    if (!order) return

    const itemsList = order.items.map((i) => {
      const variantSuffix = i.variant_label ? ` (${i.variant_label})` : ''
      return `• ${i.product_name}${variantSuffix} ×${i.quantity}`
    }).join('\n')
    const discountLine = order.coupon_code && order.discount_naira > 0
      ? `Discount (${order.coupon_code}): -₦${order.discount_naira.toLocaleString()}\n`
      : ''

    const brief = `
SHOP ORDER #${order.order_number}
========================

Customer: ${order.customer_name}
Phone: ${order.phone}
Email: ${order.email}

DELIVERY
--------
${order.delivery_address}
${order.delivery_lga}, Lagos

ITEMS:
${itemsList}

Subtotal: ₦${order.subtotal_naira.toLocaleString()}
${discountLine}Delivery: ₦${order.delivery_fee_naira.toLocaleString()}
Total: ₦${order.total_naira.toLocaleString()}
========================
`.trim()

    navigator.clipboard.writeText(brief)
    toast.success('Order brief copied!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Order not found</p>
        <Link href="/admin/shop/orders">
          <Button variant="link">Back to orders</Button>
        </Link>
      </div>
    )
  }

  // Determine available actions
  const getActions = () => {
    const actions: { status: ShopOrderStatus; label: string; icon: React.ReactNode; className: string }[] = []

    switch (order.status) {
      case 'paid':
        actions.push({
          status: 'processing',
          label: 'Start Processing',
          icon: <PlayCircle className="h-4 w-4 mr-2" />,
          className: 'bg-blue-500 hover:bg-blue-600',
        })
        break
      case 'processing':
        actions.push({
          status: 'dispatched',
          label: 'Mark Dispatched',
          icon: <Truck className="h-4 w-4 mr-2" />,
          className: 'bg-purple-500 hover:bg-purple-600',
        })
        break
      case 'dispatched':
        actions.push({
          status: 'delivered',
          label: 'Mark Delivered',
          icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
          className: 'bg-green-500 hover:bg-green-600',
        })
        break
    }

    // Cancel action (available before dispatch)
    if (['paid', 'processing'].includes(order.status)) {
      actions.push({
        status: 'cancelled',
        label: 'Cancel Order',
        icon: <XCircle className="h-4 w-4 mr-2" />,
        className: 'bg-red-500 hover:bg-red-600',
      })
    }

    return actions
  }

  const actions = getActions()

  // Determine which email can be resent based on current status
  const getResendableEmail = (o: OrderWithDetails): 'processing' | 'dispatched' | 'delivered' | null => {
    if (o.status === 'processing') return 'processing'
    if (o.status === 'dispatched') return 'dispatched'
    if (o.status === 'delivered') return 'delivered'
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/shop/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Order #{order.order_number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                ORDER_STATUS_COLORS[order.status]
              )}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className="text-gray-500 text-sm">
                {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={copyOrderBrief} variant="outline" className="gap-2">
          <Copy className="h-4 w-4" />
          Copy Brief
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer & Delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer & Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{order.customer_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <a href={`tel:${order.phone}`} className="text-purple-600 hover:underline">
                {order.phone}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <a href={`mailto:${order.email}`} className="text-purple-600 hover:underline">
                {order.email}
              </a>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium">{order.delivery_address}</p>
                  <p className="text-sm text-gray-500">{order.delivery_lga}, Lagos</p>
                  {order.zone && (
                    <p className="text-xs text-gray-400 mt-1">
                      Zone: {order.zone.name} — ₦{order.zone.fee_naira.toLocaleString()}
                    </p>
                  )}
                  {order.estimated_min_days !== null && order.estimated_max_days !== null && (
                    <p className="text-xs text-purple-600 font-medium mt-1">
                      🚚 Est. delivery: {
                        order.estimated_min_days === 0 && order.estimated_max_days === 0
                          ? 'Same day'
                          : order.estimated_min_days === order.estimated_max_days
                            ? `${order.estimated_min_days} working day${order.estimated_min_days !== 1 ? 's' : ''}`
                            : `${order.estimated_min_days}-${order.estimated_max_days} working days`
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items ({order.items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                    {item.variant_label && (
                      <p className="text-xs text-purple-600">{item.variant_label}</p>
                    )}
                    <p className="text-sm text-gray-500">×{item.quantity}</p>
                  </div>
                  <p className="font-semibold">
                    ₦{(item.unit_price_naira * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₦{order.subtotal_naira.toLocaleString()}</span>
              </div>
              {order.coupon_code && order.discount_naira > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    Discount ({order.coupon_code})
                  </span>
                  <span>−₦{order.discount_naira.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>₦{order.delivery_fee_naira.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2">
                <span>Total</span>
                <span>₦{order.total_naira.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment */}
        {order.payment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-sm">{order.payment.paystack_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-green-600 font-medium capitalize">{order.payment.paystack_status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{format(new Date(order.payment.created_at), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TimelineItem
              label="Created"
              date={order.created_at}
              done
            />
            <TimelineItem
              label="Paid"
              date={order.payment?.created_at}
              done={!!order.payment}
            />
            <TimelineItem
              label="Dispatched"
              date={order.dispatched_at}
              done={!!order.dispatched_at}
            />
            <TimelineItem
              label="Delivered"
              date={order.delivered_at}
              done={!!order.delivered_at}
            />
            {order.cancelled_at && (
              <TimelineItem
                label="Cancelled"
                date={order.cancelled_at}
                done
                variant="error"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Processing email toggle - only show when about to start processing */}
            {order.status === 'paid' && (
              <div className="flex items-center gap-3 pb-3 border-b">
                <Switch
                  id="processing-email"
                  checked={sendProcessingEmail}
                  onCheckedChange={setSendProcessingEmail}
                />
                <Label htmlFor="processing-email" className="text-sm text-gray-600">
                  Send "We're packing your order" email when processing
                </Label>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {actions.map(({ status, label, icon, className }) => (
                <Button
                  key={status}
                  onClick={() => updateStatus(status)}
                  disabled={!!actionLoading}
                  className={className}
                >
                  {actionLoading === status ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    icon
                  )}
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails Sent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.emails && order.emails.length > 0 ? (
            <div className="space-y-3">
              {order.emails.map((email) => (
                <div key={email.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {email.email_type.replace('_', ' ')} email
                      {email.is_resend && (
                        <span className="ml-2 text-xs text-gray-500">(resent)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Sent to {email.sent_to} · {format(new Date(email.sent_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No status emails sent yet.</p>
          )}

          {/* Resend button for current status */}
          {getResendableEmail(order) && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resendEmail(getResendableEmail(order)!)}
                disabled={resendLoading}
                className="gap-2"
              >
                {resendLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Resend {getResendableEmail(order)} email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {order.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">
            <strong>Note:</strong> This order was cancelled. If payment was received, a manual refund may be required via Paystack dashboard.
          </p>
        </div>
      )}
    </div>
  )
}

function TimelineItem({
  label,
  date,
  done,
  variant = 'default',
}: {
  label: string
  date?: string | null
  done: boolean
  variant?: 'default' | 'error'
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-3 h-3 rounded-full",
        done
          ? variant === 'error'
            ? 'bg-red-500'
            : 'bg-green-500'
          : 'bg-gray-200'
      )} />
      <div className="flex-1">
        <p className={cn(
          "font-medium",
          done ? "text-gray-900 dark:text-white" : "text-gray-400"
        )}>
          {label}
        </p>
      </div>
      {date && (
        <p className="text-sm text-gray-500">
          {format(new Date(date), 'MMM d, h:mm a')}
        </p>
      )}
    </div>
  )
}
