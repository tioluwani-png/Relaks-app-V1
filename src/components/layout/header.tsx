'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Search, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCart } from '@/lib/shop/cart-context'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showBack?: boolean
  showSearch?: boolean
  showNotifications?: boolean
  showBag?: boolean
  simple?: boolean // For shop pages: just back + title + bag
}

export function Header({
  title,
  showBack = false,
  showSearch = true,
  showNotifications = true,
  showBag = true,
  simple = false,
}: HeaderProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { itemCount } = useCart()
  const [unreadCount, setUnreadCount] = useState(0)
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Fetch notification count
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

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < 10) {
        setVisible(true)
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setVisible(false)
      } else if (currentScrollY < lastScrollY.current) {
        setVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Simple header for shop pages
  if (simple) {
    return (
      <header className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-11 h-11 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
            {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
          </div>
          {showBag && (
            <Link
              href="/shop/cart"
              className="flex items-center justify-center w-11 h-11 -mr-2 rounded-xl hover:bg-gray-100 transition-colors relative"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-6 w-6 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>
    )
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50 transition-transform duration-300',
        !visible && '-translate-y-full'
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-11 h-11 -ml-2 rounded-xl hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : null}
          {title ? (
            <h1 className="text-lg font-semibold">{title}</h1>
          ) : (
            <Link href="/feed" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Relaks"
                width={112}
                height={28}
                className="h-7 w-auto"
                priority
              />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {showSearch && (
            <Link
              href="/search"
              className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-muted transition-colors"
              aria-label="Search"
            >
              <Search className="h-6 w-6 text-foreground/80" />
            </Link>
          )}
          {showNotifications && (
            <Link
              href="/notifications"
              className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-muted transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="h-6 w-6 text-foreground/80" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
              )}
            </Link>
          )}
          {showBag && itemCount > 0 && (
            <Link
              href="/shop/cart"
              className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-muted transition-colors relative"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-6 w-6 text-foreground/80" />
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
