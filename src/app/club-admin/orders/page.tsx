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
  PlayCircle,
  PackageCheck,
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
  picked_up_at: string | null
  in_transit_at: string | null
  delivered_at: string | null
  returned_at: string | null
  expires_at: string | null
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
    label: 'Paid',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700',
  },
  processing: {
    label: 'Processing',
    icon: <PlayCircle className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-700',
  },
  picked_up: {
    label: 'Picked Up',
    icon: <PackageCheck className="h-4 w-4" />,
    color: 'bg-indigo-100 text-indigo-700',
  },
  in_transit: {
    label: 'In Transit',
    icon: <Truck className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-700',
  },
  delivered: {
    label: 'Delivered',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700',
  },
  awaiting_return: {
    label: 'Awaiting Return',
    icon: <RotateCcw className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-700',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'bg-emerald-100 text-emerald-700',
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
          picked_up_at,
          in_transit_at,
          delivered_at,
          returned_at,
          expires_at,
          user:users(id, username),
          plan:rental_plans(id, name, books_per_cycle),
          books:rental_subscription_books(
            book:books(id, title)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter === 'needs_action') {
        // Orders that need fulfillment action (paid but not delivered)
        query = query.in('status', ['active', 'processing', 'picked_up', 'in_transit'])
      } else if (statusFilter === 'awaiting_collection') {
        // Orders ready for book collection
        query = query.in('status', ['delivered', 'awaiting_return'])
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

  // Action handlers
  const handleAction = async (orderId: string, action: string, successMessage: string) => {
    setActionLoading(orderId)
    try {
      const response = await fetch(`/api/club-admin/orders/${orderId}/${action}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action}`)
      }

      toast.success(successMessage)
      loadOrders()
    } catch (error) {
      console.error(`${action} error:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${action}`)
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
    const isLoading = actionLoading === order.id

    // Status ladder actions
    switch (order.status) {
      case 'active':
        // Paid → Start Processing
        actions.push(
          <Button
            key="process"
            size="sm"
            onClick={() => handleAction(order.id, 'process', 'Order processing started')}
            disabled={isLoading}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <PlayCircle className="h-4 w-4 mr-1" />
                Start Processing
              </>
            )}
          </Button>
        )
        break

      case 'processing':
        // Processing → Mark Picked Up
        actions.push(
          <Button
            key="pickup"
            size="sm"
            onClick={() => handleAction(order.id, 'pickup', 'Books picked up')}
            disabled={isLoading}
            className="bg-indigo-500 hover:bg-indigo-600"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <PackageCheck className="h-4 w-4 mr-1" />
                Mark Picked Up
              </>
            )}
          </Button>
        )
        break

      case 'picked_up':
        // Picked Up → In Transit (optional) or Deliver
        actions.push(
          <Button
            key="transit"
            size="sm"
            variant="outline"
            onClick={() => handleAction(order.id, 'transit', 'Order in transit')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <Truck className="h-4 w-4 mr-1" />
                In Transit
              </>
            )}
          </Button>
        )
        actions.push(
          <Button
            key="deliver"
            size="sm"
            onClick={() => handleAction(order.id, 'deliver', 'Order delivered! Customer notified.')}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Delivered
              </>
            )}
          </Button>
        )
        break

      case 'in_transit':
        // In Transit → Deliver
        actions.push(
          <Button
            key="deliver"
            size="sm"
            onClick={() => handleAction(order.id, 'deliver', 'Order delivered! Customer notified.')}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Delivered
              </>
            )}
          </Button>
        )
        break

      case 'delivered':
      case 'awaiting_return':
        // Delivered/Awaiting Return → Mark Returned
        if (!order.returned_at) {
          actions.push(
            <Button
              key="return"
              size="sm"
              variant="outline"
              onClick={() => handleAction(order.id, 'return', 'Books returned, subscription completed')}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Returned
                </>
              )}
            </Button>
          )
        }
        break
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
          <SelectTrigger className="w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="needs_action">Needs Action</SelectItem>
            <SelectItem value="active">Paid (New)</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="awaiting_collection">Awaiting Collection</SelectItem>
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
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-400">
                        {order.picked_up_at && (
                          <span className="flex items-center gap-1">
                            <PackageCheck className="h-3 w-3" />
                            Picked {format(new Date(order.picked_up_at), 'MMM d')}
                          </span>
                        )}
                        {order.in_transit_at && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            Transit {format(new Date(order.in_transit_at), 'MMM d')}
                          </span>
                        )}
                        {order.delivered_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Delivered {format(new Date(order.delivered_at), 'MMM d')}
                          </span>
                        )}
                        {order.expires_at && order.status === 'delivered' && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Clock className="h-3 w-3" />
                            Expires {format(new Date(order.expires_at), 'MMM d')}
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
                    <div className="flex items-center gap-2 flex-wrap">
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
