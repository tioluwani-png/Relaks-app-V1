'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BookGenre } from '@/types/database'

// Module-level cache for genres
let cachedGenres: BookGenre[] | null = null
let cacheTimestamp: number | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface UseBookGenresReturn {
  genres: BookGenre[]
  isLoading: boolean
  error: string | null
  getGenre: (id: string) => BookGenre | undefined
  getGenreBySlug: (slug: string) => BookGenre | undefined
  refresh: () => Promise<void>
}

export function useBookGenres(): UseBookGenresReturn {
  const [genres, setGenres] = useState<BookGenre[]>(cachedGenres || [])
  const [isLoading, setIsLoading] = useState(!cachedGenres)
  const [error, setError] = useState<string | null>(null)

  const fetchGenres = useCallback(async (forceRefresh = false) => {
    // Use cache if valid
    if (
      !forceRefresh &&
      cachedGenres &&
      cacheTimestamp &&
      Date.now() - cacheTimestamp < CACHE_TTL
    ) {
      setGenres(cachedGenres)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/book-genres')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch genres')
      }

      cachedGenres = data.genres
      cacheTimestamp = Date.now()
      setGenres(data.genres)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGenres()
  }, [fetchGenres])

  const getGenre = useCallback((id: string) => {
    return genres.find(g => g.id === id)
  }, [genres])

  const getGenreBySlug = useCallback((slug: string) => {
    return genres.find(g => g.slug === slug)
  }, [genres])

  const refresh = async () => {
    await fetchGenres(true)
  }

  return {
    genres,
    isLoading,
    error,
    getGenre,
    getGenreBySlug,
    refresh,
  }
}

// Utility to invalidate cache from outside the hook
export function invalidateGenresCache() {
  cachedGenres = null
  cacheTimestamp = null
}
