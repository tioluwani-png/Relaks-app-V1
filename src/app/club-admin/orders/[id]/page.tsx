'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
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
  dispatched_at: string | null
  delivered_at: string | null
  returned_at: string | null
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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const supabase = createClient()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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
          dispatched_at,
          delivered_at,
          returned_at,
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

  const handleAction = async (action: 'dispatch' | 'deliver' | 'return') => {
    setActionLoading(action)
    try {
      const response = await fetch(`/api/club-admin/orders/${orderId}/${action}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action}`)
      }

      toast.success(`Order marked as ${action === 'dispatch' ? 'dispatched' : action === 'deliver' ? 'delivered' : 'returned'}`)
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

  const canDispatch = order.status === 'active' && !order.dispatched_at
  const canDeliver = order.status === 'active' && order.dispatched_at && !order.delivered_at
  const canReturn = (order.status === 'active' || order.status === 'awaiting_return') && order.delivered_at && !order.returned_at

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
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Order Created</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.dispatched_at ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Truck className={`h-4 w-4 ${order.dispatched_at ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!order.dispatched_at && 'text-gray-400'}`}>Dispatched</p>
                  <p className="text-sm text-gray-500">
                    {order.dispatched_at
                      ? format(new Date(order.dispatched_at), 'MMM d, yyyy h:mm a')
                      : 'Not yet'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.delivered_at ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <CheckCircle2 className={`h-4 w-4 ${order.delivered_at ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!order.delivered_at && 'text-gray-400'}`}>Delivered</p>
                  <p className="text-sm text-gray-500">
                    {order.delivered_at
                      ? format(new Date(order.delivered_at), 'MMM d, yyyy h:mm a')
                      : 'Not yet'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.returned_at ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <RotateCcw className={`h-4 w-4 ${order.returned_at ? 'text-purple-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${!order.returned_at && 'text-gray-400'}`}>Returned</p>
                  <p className="text-sm text-gray-500">
                    {order.returned_at
                      ? format(new Date(order.returned_at), 'MMM d, yyyy h:mm a')
                      : 'Not yet'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6 pt-4 border-t">
              {canDispatch && (
                <Button
                  onClick={() => handleAction('dispatch')}
                  disabled={!!actionLoading}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {actionLoading === 'dispatch' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Truck className="h-4 w-4 mr-2" />
                  )}
                  Mark Dispatched
                </Button>
              )}
              {canDeliver && (
                <Button
                  onClick={() => handleAction('deliver')}
                  disabled={!!actionLoading}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {actionLoading === 'deliver' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Mark Delivered
                </Button>
              )}
              {canReturn && (
                <Button
                  onClick={() => handleAction('return')}
                  disabled={!!actionLoading}
                  variant="outline"
                >
                  {actionLoading === 'return' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Mark Returned
                </Button>
              )}
            </div>
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
      </div>
    </div>
  )
}
