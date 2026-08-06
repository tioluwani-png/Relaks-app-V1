'use client'

import { CartProvider } from '@/lib/shop/cart-context'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
