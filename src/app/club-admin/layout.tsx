'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  BookOpen,
  MessageSquare,
  DollarSign,
  Calculator,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

interface ClubAdminUser {
  id: string
  email: string
  username: string
  role: UserRole
}

const CLUB_ADMIN_ROLES: UserRole[] = ['partner', 'admin', 'super_admin']

export default function ClubAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [user, setUser] = useState<ClubAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    checkClubAdminAccess()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkClubAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('id, email, username, role')
        .eq('id', session.user.id)
        .single() as { data: ClubAdminUser | null; error: unknown }

      if (error || !profile) {
        router.push('/')
        return
      }

      if (!CLUB_ADMIN_ROLES.includes(profile.role)) {
        router.push('/')
        return
      }

      setUser(profile)
    } catch {
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 dark:bg-gray-950">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isPartner = user.role === 'partner'
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  const navItems = [
    { href: '/club-admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/club-admin/orders', label: 'Orders', icon: Package },
    { href: '/club-admin/books', label: 'Books', icon: BookOpen },
    { href: '/club-admin/requests', label: 'Book Requests', icon: MessageSquare },
    { href: '/club-admin/finances', label: 'Finances', icon: DollarSign },
    { href: '/club-admin/settlements', label: 'Settlements', icon: Calculator },
  ]

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'partner':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'super_admin':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 dark:bg-gray-950 flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b dark:border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            Reading Club
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Partner Dashboard
          </p>
          <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
            {user.role.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/club-admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Link to main admin for Relaks staff */}
        {isAdmin && (
          <div className="px-4 py-2 border-t dark:border-gray-800">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              <LayoutDashboard size={16} />
              Go to Relaks Admin
            </Link>
          </div>
        )}

        {/* User info & logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen">
        {children}
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
