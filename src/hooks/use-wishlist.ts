'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BookWithGenre } from '@/types/database'

interface UseWishlistReturn {
  books: BookWithGenre[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  removeFromWishlist: (bookId: string) => Promise<void>
}

export function useWishlist(): UseWishlistReturn {
  const [books, setBooks] = useState<BookWithGenre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWishlist = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/wishlist')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch wishlist')
      }

      setBooks(data.books || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const removeFromWishlist = async (bookId: string) => {
    // Optimistic update
    setBooks(prev => prev.filter(book => book.id !== bookId))

    try {
      const response = await fetch(`/api/books/${bookId}/save`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Refresh to get accurate state
        await fetchWishlist()
      }
    } catch (err) {
      console.error('[useWishlist] Remove failed:', err)
      await fetchWishlist()
    }
  }

  return {
    books,
    isLoading,
    error,
    refresh: fetchWishlist,
    removeFromWishlist,
  }
}
