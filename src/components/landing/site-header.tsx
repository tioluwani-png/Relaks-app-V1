'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/shop/cart-context'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { NAV_LINKS, NAV_LOGIN, NAV_PRIMARY, NAV_OPEN_APP } from '@/lib/landing/content'
import { TrackedLink } from './tracked-link'

const PRIMARY_BUTTON =
  'text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/40 hover:shadow-xl hover:scale-105 transition-all duration-300'

function useHasSession() {
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return hasSession
}

function CartButton() {
  const { itemCount, isHydrating } = useCart()
  const label = itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Cart'

  return (
    <Link
      href="/shop/cart"
      aria-label={label}
      className="relative p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <ShoppingBag className="h-5 w-5" />
      {!isHydrating && itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-bold flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}

export function SiteHeader() {
  const hasSession = useHasSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FFFBF5]/80 border-b border-gray-100/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-6xl">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Relaks"
            width={120}
            height={40}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <TrackedLink
              key={link.href}
              href={link.href}
              event={link.event}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </TrackedLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {hasSession ? (
            <TrackedLink href={NAV_OPEN_APP.href} event={NAV_OPEN_APP.event} className={PRIMARY_BUTTON}>
              {NAV_OPEN_APP.label}
            </TrackedLink>
          ) : (
            <>
              <TrackedLink
                href={NAV_LOGIN.href}
                event={NAV_LOGIN.event}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-full transition-colors"
              >
                {NAV_LOGIN.label}
              </TrackedLink>
              <TrackedLink href={NAV_PRIMARY.href} event={NAV_PRIMARY.event} className={PRIMARY_BUTTON}>
                {NAV_PRIMARY.label}
              </TrackedLink>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-1">
          <CartButton />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#FFFBF5] px-6 pt-14 pb-8">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV_LINKS.map((link) => (
                  <TrackedLink
                    key={link.href}
                    href={link.href}
                    event={link.event}
                    onClick={close}
                    className="py-3 text-base font-medium text-gray-800 border-b border-gray-100"
                  >
                    {link.label}
                  </TrackedLink>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-3">
                {hasSession ? (
                  <TrackedLink
                    href={NAV_OPEN_APP.href}
                    event={NAV_OPEN_APP.event}
                    onClick={close}
                    className={`${PRIMARY_BUTTON} text-center`}
                  >
                    {NAV_OPEN_APP.label}
                  </TrackedLink>
                ) : (
                  <>
                    <TrackedLink
                      href={NAV_PRIMARY.href}
                      event={NAV_PRIMARY.event}
                      onClick={close}
                      className={`${PRIMARY_BUTTON} text-center`}
                    >
                      {NAV_PRIMARY.label}
                    </TrackedLink>
                    <TrackedLink
                      href={NAV_LOGIN.href}
                      event={NAV_LOGIN.event}
                      onClick={close}
                      className="text-center text-sm font-semibold text-gray-800 px-5 py-2.5 rounded-full border-2 border-gray-200"
                    >
                      {NAV_LOGIN.label}
                    </TrackedLink>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
