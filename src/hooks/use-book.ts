'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BookWithGenre, ReadingStatus } from '@/types/database'

interface UseBookReturn {
  book: BookWithGenre | null
  isLoading: boolean
  error: string | null
  likeBook: () => Promise<void>
  saveBook: () => Promise<void>
  updateReadStatus: (status: ReadingStatus, rating?: number | null) => Promise<void>
  refresh: () => Promise<void>
}

export function useBook(id: string): UseBookReturn {
  const [book, setBook] = useState<BookWithGenre | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBook = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/books/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch book')
      }

      setBook(data.book)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBook()
  }, [fetchBook])

  const likeBook = async () => {
    if (!book) return

    const isLiked = book.is_liked

    // Optimistic update
    setBook({
      ...book,
      is_liked: !isLiked,
      like_count: isLiked ? book.like_count - 1 : book.like_count + 1,
    })

    try {
      const response = await fetch(`/api/books/${id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        // Revert on error
        setBook({
          ...book,
          is_liked: isLiked,
          like_count: book.like_count,
        })
      }
    } catch (err) {
      console.error('[useBook] Like toggle failed:', err)
      setBook({
        ...book,
        is_liked: isLiked,
        like_count: book.like_count,
      })
    }
  }

  const saveBook = async () => {
    if (!book) return

    const isSaved = book.is_saved

    // Optimistic update
    setBook({
      ...book,
      is_saved: !isSaved,
      save_count: isSaved ? book.save_count - 1 : book.save_count + 1,
    })

    try {
      const response = await fetch(`/api/books/${id}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        // Revert on error
        setBook({
          ...book,
          is_saved: isSaved,
          save_count: book.save_count,
        })
      }
    } catch (err) {
      console.error('[useBook] Save toggle failed:', err)
      setBook({
        ...book,
        is_saved: isSaved,
        save_count: book.save_count,
      })
    }
  }

  const updateReadStatus = async (status: ReadingStatus, rating?: number | null) => {
    if (!book) return

    const previousStatus = book.user_read_status
    const previousRating = book.user_rating

    // Optimistic update
    setBook({
      ...book,
      user_read_status: status,
      user_rating: rating ?? previousRating,
    })

    try {
      const response = await fetch(`/api/books/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rating }),
      })

      if (!response.ok) {
        // Revert on error
        setBook({
          ...book,
          user_read_status: previousStatus,
          user_rating: previousRating,
        })
      }
    } catch (err) {
      console.error('[useBook] Read status update failed:', err)
      setBook({
        ...book,
        user_read_status: previousStatus,
        user_rating: previousRating,
      })
    }
  }

  return {
    book,
    isLoading,
    error,
    likeBook,
    saveBook,
    updateReadStatus,
    refresh: fetchBook,
  }
}
