'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Package,
  Loader2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
  Phone,
  Mail,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/shared/motion'
import { formatPrice } from '@/stores/cart-store'
import { format } from 'date-fns'
import type { RentalOrderWithItems, RentalOrderStatus } from '@/types/database'

const statusConfig: Record<RentalOrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: {
    label: 'Pending Payment',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  paid: {
    label: 'Payment Received',
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  processing: {
    label: 'Processing Order',
    icon: <Package className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  shipped: {
    label: 'On the Way',
    icon: <Truck className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  delivered: {
    label: 'Delivered',
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  returned: {
    label: 'Returned',
    icon: <Package className="h-5 w-5" />,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircle className="h-5 w-5" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<RentalOrderWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/orders/${orderId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch order')
        }

        setOrder(data.order)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <Package className="h-12 w-12 text-gray-400 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Order Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error || 'This order could not be found'}
        </p>
        <Link href="/orders">
          <Button>View All Orders</Button>
        </Link>
      </div>
    )
  }

  const status = statusConfig[order.status as RentalOrderStatus]

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Order Details
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(order.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status */}
        <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl p-6">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${status?.color}`}>
            {status?.icon}
            <span className="font-medium">{status?.label}</span>
          </div>

          {order.status === 'paid' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Your order is being prepared for delivery. You'll be notified once it ships.
            </p>
          )}

          {order.status === 'shipped' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Your books are on the way! Expect delivery within 2-3 business days.
            </p>
          )}
        </FadeIn>

        {/* Books */}
        <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Books ({order.items?.length})
          </h2>
          <div className="space-y-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0">
                  {item.book?.cover_url ? (
                    <Image
                      src={item.book.cover_url}
                      alt={item.book?.title || 'Book'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                      <span className="text-xl font-bold text-purple-300">
                        {item.book?.title?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {item.book?.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.book?.author}
                  </p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Delivery Details */}
        <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Delivery Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.full_name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {order.address}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {order.city}, {order.state}
                </p>
                {order.landmark && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Near: {order.landmark}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{order.phone}</p>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{order.email}</p>
            </div>

            {order.delivery_notes && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Delivery Notes
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {order.delivery_notes}
                </p>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Payment Summary */}
        <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Payment Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Subtotal ({order.items?.length} {order.items?.length === 1 ? 'book' : 'books'})
              </span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Delivery</span>
              <span>{formatPrice(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Total</span>
              <span className="text-purple-600 dark:text-purple-400">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>

          {order.payment_reference && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              <CreditCard className="h-4 w-4" />
              <span>Ref: {order.payment_reference}</span>
            </div>
          )}
        </FadeIn>

        {/* Actions */}
        {order.status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 text-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
              This order is awaiting payment. Complete your payment to proceed.
            </p>
            <Button
              onClick={async () => {
                const response = await fetch(`/api/orders/${order.id}/pay`, {
                  method: 'POST',
                })
                const data = await response.json()
                if (response.ok && data.authorization_url) {
                  window.location.href = data.authorization_url
                }
              }}
            >
              Complete Payment
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
