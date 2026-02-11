'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, ImageIcon, Flag, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalUsers: number
  totalPosts: number
  pendingReports: number
  postsToday: number
}

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    pendingReports: 0,
    postsToday: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    try {
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })

      const { count: reportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      const today = new Date().toISOString().split('T')[0]
      const { count: todayCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      setStats({
        totalUsers: usersCount || 0,
        totalPosts: postsCount || 0,
        pendingReports: reportsCount || 0,
        postsToday: todayCount || 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Posts', value: stats.totalPosts, icon: ImageIcon, color: 'bg-green-500' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: Flag, color: 'bg-red-500' },
    { label: 'Posts Today', value: stats.postsToday, icon: TrendingUp, color: 'bg-purple-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {isLoading ? '\u2014' : stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/reports"
            className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition text-center"
          >
            <Flag className="mx-auto mb-2 text-gray-400" />
            <p className="font-medium text-gray-700 dark:text-gray-300">Review Reports</p>
          </Link>
          <Link
            href="/admin/references"
            className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition text-center"
          >
            <ImageIcon className="mx-auto mb-2 text-gray-400" />
            <p className="font-medium text-gray-700 dark:text-gray-300">Upload References</p>
          </Link>
          <Link
            href="/admin/users"
            className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition text-center"
          >
            <Users className="mx-auto mb-2 text-gray-400" />
            <p className="font-medium text-gray-700 dark:text-gray-300">Manage Users</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
