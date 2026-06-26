'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, BookOpen, Search, Trophy, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useCartStore } from '@/stores/cart-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface HeaderProps {
  title?: string
  showBack?: boolean
  showSearch?: boolean
  showNotifications?: boolean
  showCart?: boolean
}

export function Header({
  title,
  showBack = false,
  showSearch = true,
  showNotifications = true,
  showCart = true,
}: HeaderProps) {
  const router = useRouter()
  const { profile, isAuthenticated } = useAuth()
  const { items, fetchCart, isInitialized } = useCartStore()
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch cart on mount
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      fetchCart()
    }
  }, [isAuthenticated, isInitialized, fetchCart])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications?unread=true')
        const data = await response.json()
        if (response.ok) {
          setUnreadCount(data.unreadCount)
        }
      } catch (error) {
        console.error('Error fetching notification count:', error)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  return (
    <header className="sticky top-0 z-40 glass shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {title ? (
            <h1 className={showBack ? 'text-lg font-semibold' : 'text-lg font-bold gradient-text'}>
              {title}
            </h1>
          ) : (
            <Link href="/feed">
              <Image
                src="/logo.png"
                alt="Relaks"
                width={120}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-xl" asChild>
            <Link href="/blog">
              <BookOpen className="h-5 w-5" />
              <span className="sr-only">Blog</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl" asChild>
            <Link href="/discover/leaderboard">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="sr-only">Leaderboard</span>
            </Link>
          </Button>
          {showSearch && (
            <Button variant="ghost" size="icon" className="rounded-xl" asChild>
              <Link href="/search">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Link>
            </Button>
          )}
          {showCart && (
            <Button variant="ghost" size="icon" className="relative rounded-xl" asChild>
              <Link href="/checkout">
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full gradient-purple-pink text-white text-[10px] flex items-center justify-center font-bold">
                    {items.length > 9 ? '9+' : items.length}
                  </span>
                )}
                <span className="sr-only">Cart</span>
              </Link>
            </Button>
          )}
          {showNotifications && (
            <Button variant="ghost" size="icon" className="relative rounded-xl" asChild>
              <Link href="/notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full gradient-purple-pink text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Link>
            </Button>
          )}
          {profile && (
            <Link href="/profile" className="ml-1">
              <div className="p-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs font-semibold">
                    {profile.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
