import type { ReactNode } from 'react'
import { CartProvider } from '@/lib/shop/cart-context'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'

/**
 * Cream page frame with the landing header and footer. Used by the home page and legal pages.
 * `after` renders below the footer (e.g. the mobile sticky bar and its spacer).
 */
export function LandingShell({ children, after }: { children: ReactNode; after?: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#FFFBF5]">
      {/* Wraps the page too, so Add to cart on the books row updates the header count */}
      <CartProvider>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        {after}
      </CartProvider>
    </div>
  )
}
