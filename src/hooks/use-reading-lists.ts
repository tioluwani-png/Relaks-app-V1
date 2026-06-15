'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReadingListWithUser } from '@/types/database'

interface UseReadingListsOptions {
  userId?: string
  mine?: boolean
  limit?: number
}

interface UseReadingListsReturn {
  lists: ReadingListWithUser[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  createList: (data: { title: string; description?: string; is_public?: boolean }) => Promise<ReadingListWithUser | null>
  deleteList: (listId: string) => Promise<boolean>
}

export function useReadingLists(options: UseReadingListsOptions = {}): UseReadingListsReturn {
  const { userId, mine = false, limit = 20 } = options
  const [lists, setLists] = useState<ReadingListWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchLists = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      })

      if (userId) params.set('user_id', userId)
      if (mine) params.set('mine', 'true')
      if (loadMore && cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/reading-lists?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lists')
      }

      if (loadMore) {
        setLists(prev => [...prev, ...data.lists])
      } else {
        setLists(data.lists)
      }

      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [userId, mine, limit, cursor])

  useEffect(() => {
    setCursor(null)
    setHasMore(true)
    fetchLists(false)
  }, [userId, mine]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!isLoadingMore && hasMore) {
      await fetchLists(true)
    }
  }

  const refresh = async () => {
    setCursor(null)
    setHasMore(true)
    await fetchLists(false)
  }

  const createList = async (data: { title: string; description?: string; is_public?: boolean }): Promise<ReadingListWithUser | null> => {
    try {
      const response = await fetch('/api/reading-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create list')
      }

      setLists(prev => [result.list, ...prev])
      return result.list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    }
  }

  const deleteList = async (listId: string): Promise<boolean> => {
    // Optimistic update
    setLists(prev => prev.filter(list => list.id !== listId))

    try {
      const response = await fetch(`/api/reading-lists/${listId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        await refresh()
        return false
      }

      return true
    } catch (err) {
      console.error('[useReadingLists] Delete failed:', err)
      await refresh()
      return false
    }
  }

  return {
    lists,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    createList,
    deleteList,
  }
}
