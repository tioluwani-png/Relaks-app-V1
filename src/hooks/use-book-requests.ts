'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BookRequestWithUser } from '@/types/database'

interface UseBookRequestsOptions {
  status?: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'all'
  sort?: 'votes' | 'newest'
  limit?: number
}

interface UseBookRequestsReturn {
  requests: BookRequestWithUser[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  vote: (requestId: string) => Promise<void>
  unvote: (requestId: string) => Promise<void>
  createRequest: (data: { book_title: string; author?: string; reason?: string }) => Promise<BookRequestWithUser | null>
}

export function useBookRequests(options: UseBookRequestsOptions = {}): UseBookRequestsReturn {
  const { status = 'pending', sort = 'votes', limit = 20 } = options
  const [requests, setRequests] = useState<BookRequestWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchRequests = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        status,
        sort,
      })

      if (loadMore && cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/book-requests?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch requests')
      }

      if (loadMore) {
        setRequests(prev => [...prev, ...data.requests])
      } else {
        setRequests(data.requests)
      }

      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [status, sort, limit, cursor])

  useEffect(() => {
    setCursor(null)
    setHasMore(true)
    fetchRequests(false)
  }, [status, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!isLoadingMore && hasMore) {
      await fetchRequests(true)
    }
  }

  const refresh = async () => {
    setCursor(null)
    setHasMore(true)
    await fetchRequests(false)
  }

  const vote = async (requestId: string) => {
    // Optimistic update
    setRequests(prev =>
      prev.map(req =>
        req.id === requestId
          ? { ...req, has_voted: true, vote_count: req.vote_count + 1 }
          : req
      )
    )

    try {
      const response = await fetch(`/api/book-requests/${requestId}/vote`, {
        method: 'POST',
      })

      if (!response.ok) {
        await refresh()
      }
    } catch (err) {
      console.error('[useBookRequests] Vote failed:', err)
      await refresh()
    }
  }

  const unvote = async (requestId: string) => {
    // Optimistic update
    setRequests(prev =>
      prev.map(req =>
        req.id === requestId
          ? { ...req, has_voted: false, vote_count: Math.max(0, req.vote_count - 1) }
          : req
      )
    )

    try {
      const response = await fetch(`/api/book-requests/${requestId}/vote`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        await refresh()
      }
    } catch (err) {
      console.error('[useBookRequests] Unvote failed:', err)
      await refresh()
    }
  }

  const createRequest = async (data: { book_title: string; author?: string; reason?: string }): Promise<BookRequestWithUser | null> => {
    try {
      const response = await fetch('/api/book-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create request')
      }

      // Add to list
      setRequests(prev => [result.request, ...prev])
      return result.request
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }

  return {
    requests,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    vote,
    unvote,
    createRequest,
  }
}
