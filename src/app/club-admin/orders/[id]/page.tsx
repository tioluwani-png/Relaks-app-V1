'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  RotateCcw,
  MapPin,
  Phone,
  Copy,
  Loader2,
  BookOpen,
  Clock,
  User,
  PlayCircle,
  PackageCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInDays } from 'date-fns'
import type { RentalSubscriptionStatus } from '@/types/database'

interface OrderDetail {
  id: string
  status: RentalSubscriptionStatus
  created_at: string
  started_at: string | null
  expires_at: string | null
  delivery_lga: string
  delivery_address: string
  delivery_phone: string
  picked_up_at: string | null
  in_transit_at: string | null
  delivered_at: string | null
  returned_at: string | null
  auto_renew: boolean
  user: { id: string; username: string; email: string } | null
  plan: { id: string; name: string; books_per_cycle: number; duration_days: number; swap_frequency: string } | null
  books: Array<{
    id: string
    returned: boolean
    returned_at: string | null
    book: { id: string; title: string; author: string; cover_url: string | null } | null
  }>
  payment: { amount_naira: number; paystack_reference: string; created_at: string } | null
}

type ActionType = 'process' | 'pickup' | 'transit' | 'deliver' | 'return'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string
  const supabase = createClient()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null)

  useEffect(() => {
    loadOrder()
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_subscriptions')
        .select(`
          id,
          status,
          created_at,
          started_at,
          expires_at,
          delivery_lga,
          delivery_address,
          delivery_phone,
          picked_up_at,
          in_transit_at,
          delivered_at,
          returned_at,
          auto_renew,
          user:users(id, username, email),
          plan:rental_plans(id, name, books_per_cycle, duration_days, swap_frequency),
          books:rental_subscription_books(
            id,
            returned,
            returned_at,
            book:books(id, title, author, cover_url)
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error

      // Get payment info
      const { data: payment } = await supabase
        .from('rental_payments')
        .select('amount_naira, paystack_reference, created_at')
        .eq('subscription_id', orderId)
        .eq('paystack_status', 'success')
        .single()

      const orderData = data as unknown as OrderDetail
      orderData.payment = payment as OrderDetail['payment']
      setOrder(orderData)
    } catch (error) {
      console.error('Failed to load order:', error)
      toast.error('Failed to load order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (action: ActionType, successMessage: string) => {
    setActionLoading(action)
    try {
      const response = await fetch(`/api/club-admin/orders/${orderId}/${action}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action}`)
      }

      toast.success(successMessage)
      loadOrder()
    } catch (error) {
      console.error(`${action} error:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const copyRiderBrief = () => {
    if (!order) return

    const bookTitles = order.books
      .map((b) => b.book?.title)
      .filter(Boolean)
      .join('\n- ')

    const isSwap = order.plan?.swap_frequency === 'monthly'
    const action = order.returned_at
      ? 'COMPLETED'
      : order.delivered_at
        ? isSwap
          ? 'COLLECT OLD BOOKS & DELIVER NEW'
          : 'COLLECT BOOKS'
        : 'DELIVER BOOKS'

    const brief = `
READING CLUB DELIVERY
=====================
Customer: ${order.user?.username || 'Unknown'}
Phone: ${order.delivery_phone}
Address: ${order.delivery_address}, ${order.delivery_lga}

Plan: ${order.plan?.name || 'Unknown'} (${order.plan?.books_per_cycle} books)

Books:
- ${bookTitles}

Action: ${action}
=====================
`.trim()

    navigator.clipboard.writeText(brief)
    toast.success('Rider brief copied to clipboard')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Order not found</p>
        <Link href="/club-admin/orders">
          <Button variant="link">Back to orders</Button>
        </Link>
      </div>
    )
  }

  // Determine available actions based on status
  const getAvailableActions = () => {
    const actions: { action: ActionType; label: string; icon: React.ReactNode; className: string }[] = []

    switch (order.status) {
      case 'active':
        actions.push({
          action: 'process',
          label: 'Start Processing',
          icon: <PlayCircle className="h-4 w-4 mr-2" />,
          className: 'bg-yellow-500 hover:bg-yellow-600',
        })
        break
      case 'processing':
        actions.push({
          action: 'pickup',
          label: 'Mark Picked Up',
          icon: <PackageCheck className="h-4 w-4 mr-2" />,
          className: 'bg-indigo-500 hover:bg-indigo-600',
        })
        break
      case 'picked_up':
        actions.push({
          action: 'transit',
          label: 'Mark In Transit',
          icon: <Truck className="h-4 w-4 mr-2" />,
          className: 'bg-purple-500 hover:bg-purple-600',
        })
        actions.push({
          action: 'deliver',
          label: 'Mark Delivered',
          icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
          className: 'bg-green-500 hover:bg-green-600',
        })
        break
      case 'in_transit':
        actions.push({
          action: 'deliver',
          label: 'Mark Delivered',
          icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
          className: 'bg-green-500 hover:bg-green-600',
        })
        break
      case 'delivered':
      case 'awaiting_return':
        if (!order.returned_at) {
          actions.push({
            action: 'return',
            label: 'Mark Returned',
            icon: <RotateCcw className="h-4 w-4 mr-2" />,
            className: 'bg-gray-500 hover:bg-gray-600',
          })
        }
        break
    }

    return actions
  }

  const availableActions = getAvailableActions()

  // Calculate days remaining if delivered
  const daysRemaining = order.delivered_at && order.expires_at
    ? Math.max(0, differenceInDays(new Date(order.expires_at), new Date()))
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/club-admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Details</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {order.user?.username} - {order.plan?.name}
            </p>
          </div>
        </div>
        <Button onClick={copyRiderBrief} variant="outline" className="gap-2">
          <Copy className="h-4 w-4" />
          Copy Rider Brief
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer & Delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Customer & Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{order.user?.username}</p>
              <p className="text-sm text-gray-500">{order.user?.email}</p>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">{order.delivery_address}</p>
                <p className="text-sm text-gray-500">{order.delivery_lga}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <p className="font-medium">{order.delivery_phone}</p>
            </div>
            {order.auto_renew && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm">
                Auto-renew enabled
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status & Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Status & Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Paid */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Paid</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              {/* Processing */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  ['processing', 'picked_up', 'in_transit', 'delivered', 'awaiting_return', 'completed'].includes(order.status)
                    ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  <PlayCircle className={`h-4 w-4 ${
                    ['processing', 'picked_up', 'in_transit', 'delivered', 'awaiting_return', 'completed'].includes(order.status)
                      ? 'text-yellow-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className={`font-medium ${order.status === 'active' && 'text-gray-400'}`}>Processing</p>
                  <p className="text-sm text-gray-500">
                    {['processing', 'picked_up', 'in_transit', 'delivered', 'awaiting_return', 'completed'].includes(order.status)
                      ? 'Started'
                      : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Picked Up */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.picked_up_at ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <PackageCheck className={`h-4 w-4 ${order.picked_up_at ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!order.picked_up_at && 'text-gray-400'}`}>Picked Up</p>
                  <p className="text-sm text-gray-500">
                    {order.picked_up_at
                      ? format(new Date(order.picked_up_at), 'MMM d, yyyy h:mm a')
                      : 'Pending'}
                  </p>
                </div>
              </div>

              {/* In Transit (optional) */}
              {order.in_transit_at && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Truck className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">In Transit</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(order.in_transit_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )}

              {/* Delivered */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.delivered_at ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Package className={`h-4 w-4 ${order.delivered_at ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!order.delivered_at && 'text-gray-400'}`}>Delivered</p>
                  <p className="text-sm text-gray-500">
                    {order.delivered_at
                      ? format(new Date(order.delivered_at), 'MMM d, yyyy h:mm a')
                      : 'Pending'}
                  </p>
                  {daysRemaining !== null && (
                    <p className="text-sm text-orange-600 font-medium">
                      {daysRemaining} days remaining
                    </p>
                  )}
                </div>
              </div>

              {/* Returned */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.returned_at ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <RotateCcw className={`h-4 w-4 ${order.returned_at ? 'text-emerald-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!order.returned_at && 'text-gray-400'}`}>Returned</p>
                  <p className="text-sm text-gray-500">
                    {order.returned_at
                      ? format(new Date(order.returned_at), 'MMM d, yyyy h:mm a')
                      : 'Pending'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {availableActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                {availableActions.map(({ action, label, icon, className }) => (
                  <Button
                    key={action}
                    onClick={() => handleAction(action, `${label} completed`)}
                    disabled={!!actionLoading}
                    className={className}
                  >
                    {actionLoading === action ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      icon
                    )}
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Books */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Books ({order.books.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {order.books.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 ${item.returned ? 'opacity-60' : ''}`}
                >
                  <div className="w-12 h-18 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                    {item.book?.cover_url ? (
                      <Image
                        src={item.book.cover_url}
                        alt={item.book.title || 'Book'}
                        width={48}
                        height={72}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.book?.title || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {item.book?.author || 'Unknown'}
                    </p>
                    {item.returned && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Returned
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        {order.payment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold">{order.payment.amount_naira.toLocaleString()} NGN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="text-sm font-mono">{order.payment.paystack_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{format(new Date(order.payment.created_at), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="font-semibold">{order.plan?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span>{order.plan?.duration_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Swap Frequency</span>
              <span className="capitalize">{order.plan?.swap_frequency?.replace('_', ' ')}</span>
            </div>
            {order.expires_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Expires</span>
                <span>{format(new Date(order.expires_at), 'MMM d, yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
