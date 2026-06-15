'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BookWithGenre, ReadingStatus } from '@/types/database'

interface UseReadingHistoryOptions {
  status?: ReadingStatus
}

interface UseReadingHistoryReturn {
  books: BookWithGenre[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateStatus: (bookId: string, status: ReadingStatus, rating?: number | null) => Promise<void>
}

export function useReadingHistory(options: UseReadingHistoryOptions = {}): UseReadingHistoryReturn {
  const { status } = options
  const [books, setBooks] = useState<BookWithGenre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/books?limit=100')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reading history')
      }

      // Filter by reading status
      let filteredBooks = (data.books || []).filter(
        (book: BookWithGenre) => book.user_read_status
      )

      // Further filter by specific status if provided
      if (status) {
        filteredBooks = filteredBooks.filter(
          (book: BookWithGenre) => book.user_read_status === status
        )
      }

      setBooks(filteredBooks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const updateStatus = async (bookId: string, newStatus: ReadingStatus, rating?: number | null) => {
    // Optimistic update
    setBooks(prev =>
      prev.map(book =>
        book.id === bookId
          ? { ...book, user_read_status: newStatus, user_rating: rating ?? book.user_rating }
          : book
      )
    )

    try {
      const response = await fetch(`/api/books/${bookId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, rating }),
      })

      if (!response.ok) {
        await fetchHistory()
      }
    } catch (err) {
      console.error('[useReadingHistory] Update failed:', err)
      await fetchHistory()
    }
  }

  return {
    books,
    isLoading,
    error,
    refresh: fetchHistory,
    updateStatus,
  }
}
