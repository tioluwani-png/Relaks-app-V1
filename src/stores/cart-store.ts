'use client'

import { create } from 'zustand'
import type { CartItemWithBook } from '@/types/database'

// Pricing constants (in kobo)
export const BOOK_RENTAL_PRICE = 300000 // ₦3,000
export const LAGOS_DELIVERY_FEE = 300000 // ₦3,000

// Format price from kobo to Naira
export function formatPrice(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`
}

interface CartState {
  items: CartItemWithBook[]
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  fetchCart: () => Promise<void>
  addToCart: (bookId: string) => Promise<boolean>
  removeFromCart: (bookId: string) => Promise<boolean>
  clearCart: () => Promise<void>
  isInCart: (bookId: string) => boolean

  // Computed getters
  getItemCount: () => number
  getSubtotal: () => number
  getDeliveryFee: () => number
  getTotal: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  isInitialized: false,
  error: null,

  fetchCart: async () => {
    if (get().isLoading) return

    set({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/cart')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cart')
      }

      set({ items: data.items, isInitialized: true })
    } catch (error) {
      console.error('Error fetching cart:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch cart' })
    } finally {
      set({ isLoading: false })
    }
  },

  addToCart: async (bookId: string) => {
    const { items } = get()

    // Check if already in cart
    if (items.some(item => item.book_id === bookId)) {
      return true
    }

    set({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add to cart')
      }

      set({ items: [...items, data.item] })
      return true
    } catch (error) {
      console.error('Error adding to cart:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to add to cart' })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  removeFromCart: async (bookId: string) => {
    const { items } = get()
    const originalItems = [...items]

    // Optimistic update
    set({ items: items.filter(item => item.book_id !== bookId) })

    try {
      const response = await fetch(`/api/cart/${bookId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove from cart')
      }

      return true
    } catch (error) {
      console.error('Error removing from cart:', error)
      // Revert on error
      set({ items: originalItems, error: error instanceof Error ? error.message : 'Failed to remove from cart' })
      return false
    }
  },

  clearCart: async () => {
    const { items } = get()
    const originalItems = [...items]

    // Optimistic update
    set({ items: [] })

    try {
      const response = await fetch('/api/cart/clear', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear cart')
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
      // Revert on error
      set({ items: originalItems, error: error instanceof Error ? error.message : 'Failed to clear cart' })
    }
  },

  isInCart: (bookId: string) => {
    return get().items.some(item => item.book_id === bookId)
  },

  getItemCount: () => {
    return get().items.length
  },

  getSubtotal: () => {
    return get().items.length * BOOK_RENTAL_PRICE
  },

  getDeliveryFee: () => {
    // Only charge delivery if there are items
    return get().items.length > 0 ? LAGOS_DELIVERY_FEE : 0
  },

  getTotal: () => {
    const subtotal = get().getSubtotal()
    const delivery = get().getDeliveryFee()
    return subtotal + delivery
  },
}))
