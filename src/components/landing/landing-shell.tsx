import type { ReactNode } from 'react'
import { CartProvider } from '@/lib/shop/cart-context'
import { fraunces } from '@/lib/landing/fonts'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import type { Tone } from './section'

/**
 * Cream page frame with the landing header and footer. Used by the home page and legal pages.
 * `after` renders below the footer (e.g. the mobile sticky bar and its spacer).
 * `footerTone` lets the home page keep its section backgrounds alternating into the footer.
 * The `landing` class turns on the focus-ring styles in globals.css.
 */
export function LandingShell({
  children,
  after,
  footerTone = 'tint',
}: {
  children: ReactNode
  after?: ReactNode
  footerTone?: Tone
}) {
  return (
    <div className={`landing ${fraunces.variable} min-h-screen overflow-x-clip bg-relaks-cream text-relaks-ink`}>
      {/* Wraps the page too, so Add to cart on the books row updates the header count */}
      <CartProvider>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter tone={footerTone} />
        {after}
      </CartProvider>
    </div>
  )
}
