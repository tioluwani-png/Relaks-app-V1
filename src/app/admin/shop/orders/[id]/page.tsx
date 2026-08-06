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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type ShopOrderStatus } from '@/lib/shop/config'
import { sendShopOrderDispatchedEmail } from '@/lib/shop/emails'
import type { ShopOrder, ShopOrderItem, ShopDeliveryZone, ShopPayment } from '@/types/database'
import { cn } from '@/lib/utils'

interface OrderWithDetails extends ShopOrder {
  items: ShopOrderItem[]
  zone: ShopDeliveryZone | null
  payment: ShopPayment | null
}

export default function AdminShopOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const supabase = createClient()

  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

      const orderData = data as unknown as OrderWithDetails
      orderData.payment = payment as ShopPayment | null
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
      const updates: Partial<ShopOrder> = { status: newStatus }

      if (newStatus === 'dispatched') {
        updates.dispatched_at = new Date().toISOString()
      } else if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString()
      } else if (newStatus === 'cancelled') {
        updates.cancelled_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('shop_orders')
        .update(updates as never)
        .eq('id', orderId)

      if (error) throw error

      // Send dispatch email
      if (newStatus === 'dispatched') {
        await sendShopOrderDispatchedEmail(order.email, order.customer_name, order.order_number)
      }

      // Restore stock on cancel (only for paid orders)
      if (newStatus === 'cancelled' && order.status !== 'pending_payment') {
        for (const item of order.items) {
          if (item.product_id) {
            // Get current stock and increment
            const { data: productData } = await supabase
              .from('shop_products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single()

            if (productData) {
              const currentStock = (productData as { stock_quantity: number }).stock_quantity || 0
              await supabase
                .from('shop_products')
                .update({ stock_quantity: currentStock + item.quantity } as never)
                .eq('id', item.product_id)
            }
          }
        }
        toast.info('Stock has been restored')
      }

      toast.success(`Order marked as ${ORDER_STATUS_LABELS[newStatus]}`)
      loadOrder()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update order')
    } finally {
      setActionLoading(null)
    }
  }

  const copyOrderBrief = () => {
    if (!order) return

    const itemsList = order.items.map((i) => `• ${i.product_name} ×${i.quantity}`).join('\n')

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
          <CardContent className="flex flex-wrap gap-3 p-4">
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
          </CardContent>
        </Card>
      )}

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
