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
import type { ShopProduct } from '@/types/database'

const STORAGE_KEY = 'relaks_cart_v1'
const DEBOUNCE_MS = 300

// Stored cart item (minimal data - prices are NEVER trusted from storage)
interface StoredCartItem {
  productId: string
  quantity: number
}

// Runtime cart item with full product data
export interface CartItem {
  product: ShopProduct
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  subtotal: number
  isHydrating: boolean
  addItem: (product: ShopProduct, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (productId: string) => number
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
        // Fetch current product data from server - NEVER trust stored prices
        const productIds = stored.map((item) => item.productId)
        const res = await fetch('/api/shop/products/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds }),
        })

        if (!res.ok) {
          // API failed - start with empty cart
          safeClearStorage()
          setIsHydrating(false)
          return
        }

        const { products } = (await res.json()) as { products: ShopProduct[] }
        const productMap = new Map<string, ShopProduct>()
        for (const p of products) {
          productMap.set(p.id, p)
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

          if (product.stock_quantity <= 0) {
            // Out of stock
            removedItems.push(product.name)
            continue
          }

          // Cap quantity at available stock
          const quantity = Math.min(storedItem.quantity, product.stock_quantity)

          validItems.push({
            product,
            quantity,
          })
        }

        setItems(validItems)

        // Update storage with validated items
        if (removedItems.length > 0 || validItems.length !== stored.length) {
          const toStore: StoredCartItem[] = validItems.map((item) => ({
            productId: item.product.id,
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
    (product: ShopProduct, quantity = 1) => {
      setItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.id === product.id)
        let newItems: CartItem[]

        if (existingIndex >= 0) {
          // Update quantity
          newItems = [...prev]
          const newQty = newItems[existingIndex].quantity + quantity
          // Cap at stock quantity
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: Math.min(newQty, product.stock_quantity),
          }
        } else {
          // Add new item
          newItems = [
            ...prev,
            { product, quantity: Math.min(quantity, product.stock_quantity) },
          ]
        }

        persistToStorage(newItems)
        return newItems
      })
    },
    [persistToStorage]
  )

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => {
        const newItems = prev.filter((item) => item.product.id !== productId)
        persistToStorage(newItems)
        return newItems
      })
    },
    [persistToStorage]
  )

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId)
        return
      }

      setItems((prev) => {
        const newItems = prev.map((item) => {
          if (item.product.id !== productId) return item
          return {
            ...item,
            quantity: Math.min(quantity, item.product.stock_quantity),
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
    (productId: string) => {
      const item = items.find((i) => i.product.id === productId)
      return item?.quantity ?? 0
    },
    [items]
  )

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price_naira * item.quantity, 0),
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
