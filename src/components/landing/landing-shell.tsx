import type { ReactNode } from 'react'
import { CartProvider } from '@/lib/shop/cart-context'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'

/** Cream page frame with the landing header and footer. Used by the home page and legal pages. */
export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#FFFBF5]">
      <CartProvider>
        <SiteHeader />
      </CartProvider>
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
