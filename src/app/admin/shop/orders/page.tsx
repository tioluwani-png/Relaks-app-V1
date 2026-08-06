'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Search, Package, ShoppingBag, Copy, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUSES, type ShopOrderStatus } from '@/lib/shop/config'
import type { ShopOrder, ShopOrderItem } from '@/types/database'
import { cn } from '@/lib/utils'

interface OrderWithItems extends ShopOrder {
  items: ShopOrderItem[]
}

export default function AdminShopOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ShopOrderStatus | 'all'>('all')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('shop_orders')
        .select(`
          *,
          items:shop_order_items(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders((data || []) as OrderWithItems[])
    } catch (error) {
      console.error('Failed to load orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const copyOrderBrief = (order: OrderWithItems) => {
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

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery)

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Orders</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage orders ({orders.length})
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order #, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ShopOrderStatus | 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">
                        #{order.order_number}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        ORDER_STATUS_COLORS[order.status]
                      )}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      {order.customer_name}
                    </p>
                    <p className="text-sm text-gray-500">{order.phone}</p>

                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-500">
                        {order.delivery_lga}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">
                        {order.items.length} item{order.items.length !== 1 && 's'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ₦{order.total_naira.toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOrderBrief(order)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Link href={`/admin/shop/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
