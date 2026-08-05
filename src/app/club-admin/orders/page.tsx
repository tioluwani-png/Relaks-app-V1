'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Package,
  Truck,
  CheckCircle2,
  RotateCcw,
  Search,
  Loader2,
  ChevronRight,
  Clock,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'
import type { RentalSubscriptionStatus } from '@/types/database'

interface OrderRow {
  id: string
  status: RentalSubscriptionStatus
  created_at: string
  delivery_lga: string
  delivery_address: string
  delivery_phone: string
  dispatched_at: string | null
  delivered_at: string | null
  returned_at: string | null
  user: { id: string; username: string } | null
  plan: { id: string; name: string; books_per_cycle: number } | null
  books: Array<{ book: { id: string; title: string } | null }>
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending_payment: {
    label: 'Pending Payment',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-700',
  },
  active: {
    label: 'Active',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700',
  },
  awaiting_return: {
    label: 'Awaiting Return',
    icon: <RotateCcw className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-700',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-red-100 text-red-700',
  },
}

export default function ClubAdminOrdersPage() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  )
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('rental_subscriptions')
        .select(`
          id,
          status,
          created_at,
          delivery_lga,
          delivery_address,
          delivery_phone,
          dispatched_at,
          delivered_at,
          returned_at,
          user:users(id, username),
          plan:rental_plans(id, name, books_per_cycle),
          books:rental_subscription_books(
            book:books(id, title)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter === 'awaiting_dispatch') {
        query = query.eq('status', 'active').is('dispatched_at', null)
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setOrders((data || []) as unknown as OrderRow[])
    } catch (error) {
      console.error('Failed to load orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkDispatched = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const response = await fetch(`/api/club-admin/orders/${orderId}/dispatch`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark as dispatched')
      }

      toast.success('Order marked as dispatched')
      loadOrders()
    } catch (error) {
      console.error('Dispatch error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to dispatch')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkDelivered = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const response = await fetch(`/api/club-admin/orders/${orderId}/deliver`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark as delivered')
      }

      toast.success('Order marked as delivered')
      loadOrders()
    } catch (error) {
      console.error('Deliver error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to deliver')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkReturned = async (orderId: string) => {
    setActionLoading(orderId)
    try {
      const response = await fetch(`/api/club-admin/orders/${orderId}/return`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark as returned')
      }

      toast.success('Order marked as returned')
      loadOrders()
    } catch (error) {
      console.error('Return error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to return')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.user?.username?.toLowerCase().includes(query) ||
      order.delivery_phone?.includes(query) ||
      order.delivery_lga?.toLowerCase().includes(query)
    )
  })

  const getOrderActions = (order: OrderRow) => {
    const actions: React.ReactNode[] = []

    // Not dispatched yet
    if (order.status === 'active' && !order.dispatched_at) {
      actions.push(
        <Button
          key="dispatch"
          size="sm"
          onClick={() => handleMarkDispatched(order.id)}
          disabled={actionLoading === order.id}
          className="bg-blue-500 hover:bg-blue-600"
        >
          {actionLoading === order.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Truck className="h-4 w-4 mr-1" />
              Dispatch
            </>
          )}
        </Button>
      )
    }

    // Dispatched but not delivered
    if (order.status === 'active' && order.dispatched_at && !order.delivered_at) {
      actions.push(
        <Button
          key="deliver"
          size="sm"
          onClick={() => handleMarkDelivered(order.id)}
          disabled={actionLoading === order.id}
          className="bg-green-500 hover:bg-green-600"
        >
          {actionLoading === order.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Delivered
            </>
          )}
        </Button>
      )
    }

    // Delivered but not returned (or awaiting_return status)
    if (
      (order.status === 'active' || order.status === 'awaiting_return') &&
      order.delivered_at &&
      !order.returned_at
    ) {
      actions.push(
        <Button
          key="return"
          size="sm"
          variant="outline"
          onClick={() => handleMarkReturned(order.id)}
          disabled={actionLoading === order.id}
        >
          {actionLoading === order.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-1" />
              Returned
            </>
          )}
        </Button>
      )
    }

    return actions
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage rental subscriptions and fulfillment
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="awaiting_dispatch">Awaiting Dispatch</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="awaiting_return">Awaiting Return</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.active
            const bookTitles = order.books?.map((b) => b.book?.title).filter(Boolean)

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.user?.username || 'Unknown'} - {order.plan?.name || 'Unknown Plan'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {bookTitles?.join(', ') || 'No books'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {order.delivery_lga} • {order.delivery_phone}
                      </p>

                      {/* Status timeline */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        {order.dispatched_at && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            Dispatched {format(new Date(order.dispatched_at), 'MMM d')}
                          </span>
                        )}
                        {order.delivered_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Delivered {format(new Date(order.delivered_at), 'MMM d')}
                          </span>
                        )}
                        {order.returned_at && (
                          <span className="flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            Returned {format(new Date(order.returned_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {getOrderActions(order)}
                      <Link href={`/club-admin/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
