'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Header } from '@/components/layout/header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { VerificationBadge } from '@/components/shared/verification-badge'
import {
  ShoppingBag,
  Coins,
  Bookmark,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const menuItems = [
  {
    href: '/orders',
    icon: ShoppingBag,
    label: 'My Orders',
    description: 'Track your shop orders',
  },
  {
    href: '/profile/credits',
    icon: Coins,
    label: 'Credits',
    description: 'Coloring and AI credits',
  },
  {
    href: '/profile/downloads',
    icon: Bookmark,
    label: 'Saved',
    description: 'Saved posts and downloads',
  },
  {
    href: '/journal/history',
    icon: BookOpen,
    label: 'Journal History',
    description: 'Your past journal entries',
  },
  {
    href: '/blog',
    icon: FileText,
    label: 'Blog',
    description: 'Read articles and stories',
  },
  {
    href: '/profile/settings',
    icon: Settings,
    label: 'Settings',
    description: 'Account and preferences',
  },
]

export default function MePage() {
  const router = useRouter()
  const { profile, isLoading } = useAuth()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Me" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Me" />
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <User className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to continue</h2>
          <p className="text-muted-foreground mb-6">Access your profile, orders, and settings</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Me" />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Profile Card */}
        <Link href="/profile">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm"
          >
            <div className="p-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
              <Avatar className="h-16 w-16 border-2 border-background">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-xl font-semibold">
                  {profile.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                  {profile.display_name || profile.username}
                </h2>
                {profile.is_verified && (
                  <VerificationBadge isVerified={true} verificationType={profile.verification_type} size="sm" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              <p className="text-xs text-muted-foreground mt-0.5">View profile</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </Link>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={item.href}>
                  <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-sm transition-shadow text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <LogOut className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-red-600 dark:text-red-400">Log Out</p>
            <p className="text-sm text-muted-foreground">Sign out of your account</p>
          </div>
        </button>
      </div>
    </div>
  )
}
