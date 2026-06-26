'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Package, Loader2, Clock, CheckCircle2, Truck, XCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/shared/motion'
import { formatPrice } from '@/stores/cart-store'
import { formatDistanceToNow } from 'date-fns'
import type { RentalOrderWithItems, RentalOrderStatus } from '@/types/database'

const statusConfig: Record<RentalOrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: {
    label: 'Pending Payment',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  paid: {
    label: 'Paid',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  processing: {
    label: 'Processing',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  shipped: {
    label: 'Shipped',
    icon: <Truck className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  delivered: {
    label: 'Delivered',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  returned: {
    label: 'Returned',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <XCircle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<RentalOrderWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchOrders = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const params = new URLSearchParams({ limit: '10' })
      if (loadMore && cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/orders?${params}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      if (loadMore) {
        setOrders(prev => [...prev, ...data.orders])
      } else {
        setOrders(data.orders)
      }

      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [cursor])

  useEffect(() => {
    fetchOrders()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/reading"
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                My Orders
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track your book rentals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : orders.length === 0 ? (
          <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No orders yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Start renting books from our collection
            </p>
            <Link href="/books">
              <Button>Browse Books</Button>
            </Link>
          </FadeIn>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status as RentalOrderStatus]

              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}>
                          {status?.icon}
                          {status?.label}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Books preview */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex -space-x-2">
                        {order.items?.slice(0, 3).map((item, index) => (
                          <div
                            key={item.id}
                            className="relative w-10 h-14 rounded-md overflow-hidden border-2 border-white dark:border-gray-900"
                            style={{ zIndex: 3 - index }}
                          >
                            {item.book?.cover_url ? (
                              <Image
                                src={item.book.cover_url}
                                alt={item.book?.title || 'Book'}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20" />
                            )}
                          </div>
                        ))}
                        {order.items && order.items.length > 3 && (
                          <div className="w-10 h-14 rounded-md bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-medium text-gray-500">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {order.items?.length} {order.items?.length === 1 ? 'book' : 'books'}
                      </span>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </FadeIn>
                </Link>
              )
            })}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchOrders(true)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
