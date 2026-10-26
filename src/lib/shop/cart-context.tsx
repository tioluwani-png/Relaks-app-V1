'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react'
import { toast } from 'sonner'
import type { ShopProduct, ShopProductVariant } from '@/types/database'

const STORAGE_KEY = 'relaks_cart_v2'
const DEBOUNCE_MS = 300

// Stored cart item (minimal data - prices are NEVER trusted from storage)
interface StoredCartItem {
  productId: string
  variantId: string | null
  quantity: number
}

// Runtime cart item with full product data
export interface CartItem {
  product: ShopProduct
  variant: ShopProductVariant | null
  quantity: number
}

// Helper to generate cart item key
export function getCartItemKey(productId: string, variantId: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId
}

// Helper to get effective price (variant price or product price)
export function getEffectivePrice(product: ShopProduct, variant: ShopProductVariant | null): number {
  return variant?.price_naira ?? product.price_naira
}

// Helper to get effective stock (variant stock or product stock)
export function getEffectiveStock(product: ShopProduct, variant: ShopProductVariant | null): number {
  return variant ? variant.stock_quantity : product.stock_quantity
}

// Helper to get variant label from option_values
export function getVariantLabel(variant: ShopProductVariant | null): string | null {
  if (!variant || !variant.option_values) return null
  const values = Object.values(variant.option_values)
  return values.length > 0 ? values.join(' / ') : null
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  subtotal: number
  isHydrating: boolean
  addItem: (product: ShopProduct, variant?: ShopProductVariant | null, quantity?: number) => void
  removeItem: (productId: string, variantId?: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (productId: string, variantId?: string | null) => number
}

const CartContext = createContext<CartContextType | null>(null)

// Safe localStorage access - private browsing can throw
function safeGetStorage(): StoredCartItem[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    // Basic validation
    if (!Array.isArray(parsed)) return null
    return parsed.filter(
      (item): item is StoredCartItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.productId === 'string' &&
        (item.variantId === null || typeof item.variantId === 'string') &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
    )
  } catch {
    return null
  }
}

function safeSetStorage(items: StoredCartItem[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  } catch {
    // Storage unavailable (private browsing) - degrade silently
  }
}

function safeClearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrating, setIsHydrating] = useState(true)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Persist to storage on changes (debounced)
  const persistToStorage = useCallback((cartItems: CartItem[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      const toStore: StoredCartItem[] = cartItems.map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id ?? null,
        quantity: item.quantity,
      }))
      safeSetStorage(toStore)
    }, DEBOUNCE_MS)
  }, [])

  // Hydrate from storage on mount
  useEffect(() => {
    const hydrateCart = async () => {
      const stored = safeGetStorage()

      if (!stored || stored.length === 0) {
        setIsHydrating(false)
        return
      }

      try {
        // Fetch current product and variant data from server - NEVER trust stored prices
        const productIds = [...new Set(stored.map((item) => item.productId))]
        const variantIds = stored
          .filter((item) => item.variantId)
          .map((item) => item.variantId as string)

        const res = await fetch('/api/shop/products/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds, variantIds }),
        })

        if (!res.ok) {
          // API failed - start with empty cart
          safeClearStorage()
          setIsHydrating(false)
          return
        }

        const { products, variants } = (await res.json()) as {
          products: ShopProduct[]
          variants?: ShopProductVariant[]
        }
        const productMap = new Map<string, ShopProduct>()
        const variantMap = new Map<string, ShopProductVariant>()

        for (const p of products) {
          productMap.set(p.id, p)
        }
        for (const v of variants ?? []) {
          variantMap.set(v.id, v)
        }

        const validItems: CartItem[] = []
        const removedItems: string[] = []

        for (const storedItem of stored) {
          const product = productMap.get(storedItem.productId)

          if (!product) {
            // Product deleted or inactive
            removedItems.push(storedItem.productId)
            continue
          }

          // Handle variant items
          let variant: ShopProductVariant | null = null
          if (storedItem.variantId) {
            variant = variantMap.get(storedItem.variantId) ?? null
            if (!variant) {
              // Variant deleted or inactive
              removedItems.push(product.name)
              continue
            }
          }

          // Get effective stock
          const stock = getEffectiveStock(product, variant)

          if (stock <= 0) {
            // Out of stock
            removedItems.push(variant ? `${product.name} (${getVariantLabel(variant)})` : product.name)
            continue
          }

          // Cap quantity at available stock
          const quantity = Math.min(storedItem.quantity, stock)

          validItems.push({
            product,
            variant,
            quantity,
          })
        }

        setItems(validItems)

        // Update storage with validated items
        if (removedItems.length > 0 || validItems.length !== stored.length) {
          const toStore: StoredCartItem[] = validItems.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id ?? null,
            quantity: item.quantity,
          }))
          safeSetStorage(toStore)

          // Show notice about removed items
          if (removedItems.length === 1) {
            toast('One item is no longer available and was removed from your cart.', {
              duration: 4000,
            })
          } else if (removedItems.length > 1) {
            toast(`${removedItems.length} items are no longer available and were removed from your cart.`, {
              duration: 4000,
            })
          }
        }
      } catch (error) {
        console.error('Cart hydration error:', error)
        // On error, start fresh
        safeClearStorage()
      } finally {
        setIsHydrating(false)
      }
    }

    hydrateCart()

    // Cleanup debounce on unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const addItem = useCallback(
    (product: ShopProduct, variant: ShopProductVariant | null = null, quantity = 1) => {
      setItems((prev) => {
        const itemKey = getCartItemKey(product.id, variant?.id ?? null)
        const existingIndex = prev.findIndex(
          (item) => getCartItemKey(item.product.id, item.variant?.id ?? null) === itemKey
        )
        const stock = getEffectiveStock(product, variant)
        let newItems: CartItem[]

        if (existingIndex >= 0) {
          // Update quantity
          newItems = [...prev]
          const newQty = newItems[existingIndex].quantity + quantity
          // Cap at stock quantity
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: Math.min(newQty, stock),
          }
        } else {
          // Add new item
          newItems = [
            ...prev,
            { product, variant, quantity: Math.min(quantity, stock) },
          ]
        }

        persistToStorage(newItems)
        return newItems
      })
    },
    [persistToStorage]
  )

  const removeItem = useCallback(
    (productId: string, variantId: string | null = null) => {
      setItems((prev) => {
        const itemKey = getCartItemKey(productId, variantId)
        const newItems = prev.filter(
          (item) => getCartItemKey(item.product.id, item.variant?.id ?? null) !== itemKey
        )
        persistToStorage(newItems)
        return newItems
      })
    },
    [persistToStorage]
  )

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, variantId)
        return
      }

      const itemKey = getCartItemKey(productId, variantId)

      setItems((prev) => {
        const newItems = prev.map((item) => {
          if (getCartItemKey(item.product.id, item.variant?.id ?? null) !== itemKey) return item
          const stock = getEffectiveStock(item.product, item.variant)
          return {
            ...item,
            quantity: Math.min(quantity, stock),
          }
        })
        persistToStorage(newItems)
        return newItems
      })
    },
    [removeItem, persistToStorage]
  )

  const clearCart = useCallback(() => {
    setItems([])
    safeClearStorage()
  }, [])

  const getItemQuantity = useCallback(
    (productId: string, variantId: string | null = null) => {
      const itemKey = getCartItemKey(productId, variantId)
      const item = items.find(
        (i) => getCartItemKey(i.product.id, i.variant?.id ?? null) === itemKey
      )
      return item?.quantity ?? 0
    },
    [items]
  )

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => {
      const price = getEffectivePrice(item.product, item.variant)
      return sum + price * item.quantity
    }, 0),
    [items]
  )

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      isHydrating,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getItemQuantity,
    }),
    [
      items,
      itemCount,
      subtotal,
      isHydrating,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getItemQuantity,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
