'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, BookOpen, DollarSign, Clock, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  activeSubscriptions: number
  awaitingDispatch: number
  booksOnLoan: number
  revenueThisMonth: number
}

interface PendingOrder {
  id: string
  created_at: string
  delivery_lga: string
  user: { username: string } | null
  plan: { name: string } | null
}

export default function ClubAdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    try {
      // Get current month start
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Fetch stats in parallel
      const [
        activeSubsResult,
        awaitingDispatchResult,
        booksOnLoanResult,
        revenueResult,
        pendingOrdersResult,
      ] = await Promise.all([
        // Active subscriptions
        supabase
          .from('rental_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        // Awaiting dispatch (paid but not dispatched)
        supabase
          .from('rental_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .is('dispatched_at', null),
        // Books on loan (subscription books not returned)
        supabase
          .from('rental_subscription_books')
          .select('id', { count: 'exact', head: true })
          .eq('returned', false),
        // Revenue this month
        supabase
          .from('rental_payments')
          .select('amount_naira')
          .eq('paystack_status', 'success')
          .gte('created_at', monthStart),
        // Pending orders (oldest first, limit 5)
        supabase
          .from('rental_subscriptions')
          .select(`
            id,
            created_at,
            delivery_lga,
            user:users(username),
            plan:rental_plans(name)
          `)
          .eq('status', 'active')
          .is('dispatched_at', null)
          .order('created_at', { ascending: true })
          .limit(5),
      ])

      const payments = (revenueResult.data || []) as Array<{ amount_naira: number }>
      const revenueTotal = payments.reduce(
        (sum, p) => sum + (p.amount_naira || 0),
        0
      )

      setStats({
        activeSubscriptions: activeSubsResult.count || 0,
        awaitingDispatch: awaitingDispatchResult.count || 0,
        booksOnLoan: booksOnLoanResult.count || 0,
        revenueThisMonth: revenueTotal,
      })

      // Type assertion for pending orders
      const orders = (pendingOrdersResult.data || []) as unknown as PendingOrder[]
      setPendingOrders(orders)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Reading Club overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.activeSubscriptions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats?.awaitingDispatch ? 'ring-2 ring-orange-500' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting Dispatch</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.awaitingDispatch || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Books on Loan</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.booksOnLoan || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue (This Month)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.revenueThisMonth?.toLocaleString() || 0} NGN
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-6">
              No orders awaiting dispatch
            </p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/club-admin/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {order.user?.username || 'Unknown'} - {order.plan?.name || 'Unknown Plan'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.delivery_lga} • {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
              {stats?.awaitingDispatch && stats.awaitingDispatch > 5 && (
                <Link
                  href="/club-admin/orders?status=awaiting_dispatch"
                  className="block text-center text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 py-2"
                >
                  View all {stats.awaitingDispatch} pending orders
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
