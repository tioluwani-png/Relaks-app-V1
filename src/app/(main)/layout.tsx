'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/layout/bottom-nav'

// Paths where bottom nav is hidden (shop pages, create flows, etc.)
function shouldHideBottomPadding(pathname: string): boolean {
  if (pathname.startsWith('/shop/')) return true
  if (pathname.startsWith('/create/')) return true
  if (pathname.startsWith('/rent/checkout')) return true
  return false
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideBottomPadding = shouldHideBottomPadding(pathname)

  return (
    <div className={`min-h-screen bg-background ${hideBottomPadding ? '' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]'}`}>
      {children}
      <BottomNav />
    </div>
  )
}
