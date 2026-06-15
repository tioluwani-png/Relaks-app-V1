'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BookWithGenre } from '@/types/database'

interface UseBooksOptions {
  genre?: string
  search?: string
  sort?: 'newest' | 'oldest' | 'most_saved' | 'most_liked'
  limit?: number
}

interface UseBooksReturn {
  books: BookWithGenre[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useBooks(options: UseBooksOptions = {}): UseBooksReturn {
  const { genre, search, sort = 'newest', limit = 20 } = options
  const [books, setBooks] = useState<BookWithGenre[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchBooks = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        sort,
      })

      if (genre) params.set('genre', genre)
      if (search) params.set('search', search)
      if (loadMore && cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/books?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch books')
      }

      if (loadMore) {
        setBooks(prev => [...prev, ...data.books])
      } else {
        setBooks(data.books)
      }

      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [genre, search, sort, limit, cursor])

  useEffect(() => {
    setCursor(null)
    setHasMore(true)
    fetchBooks(false)
  }, [genre, search, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!isLoadingMore && hasMore) {
      await fetchBooks(true)
    }
  }

  const refresh = async () => {
    setCursor(null)
    setHasMore(true)
    await fetchBooks(false)
  }

  return {
    books,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}
