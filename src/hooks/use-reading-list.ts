'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BookWithGenre, User } from '@/types/database'

interface ListBook extends BookWithGenre {
  position: number
  notes: string | null
  added_at: string
}

interface ReadingListDetail {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  book_count: number
  follower_count: number
  created_at: string
  user_id: string
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'verification_type'>
  books: ListBook[]
  is_following: boolean
}

interface UseReadingListReturn {
  list: ReadingListDetail | null
  isLoading: boolean
  error: string | null
  isOwner: boolean
  follow: () => Promise<void>
  unfollow: () => Promise<void>
  addBook: (bookId: string, notes?: string) => Promise<boolean>
  removeBook: (bookId: string) => Promise<boolean>
  updateList: (data: { title?: string; description?: string; is_public?: boolean }) => Promise<boolean>
  deleteList: () => Promise<boolean>
  refresh: () => Promise<void>
}

export function useReadingList(id: string, currentUserId?: string): UseReadingListReturn {
  const [list, setList] = useState<ReadingListDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reading-lists/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch list')
      }

      setList(data.list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const follow = async () => {
    if (!list) return

    // Optimistic update
    setList({
      ...list,
      is_following: true,
      follower_count: list.follower_count + 1,
    })

    try {
      const response = await fetch(`/api/reading-lists/${id}/follow`, {
        method: 'POST',
      })

      if (!response.ok) {
        await fetchList()
      }
    } catch (err) {
      console.error('[useReadingList] Follow failed:', err)
      await fetchList()
    }
  }

  const unfollow = async () => {
    if (!list) return

    // Optimistic update
    setList({
      ...list,
      is_following: false,
      follower_count: Math.max(0, list.follower_count - 1),
    })

    try {
      const response = await fetch(`/api/reading-lists/${id}/follow`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        await fetchList()
      }
    } catch (err) {
      console.error('[useReadingList] Unfollow failed:', err)
      await fetchList()
    }
  }

  const addBook = async (bookId: string, notes?: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/reading-lists/${id}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId, notes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add book')
      }

      // Refresh to get updated list
      await fetchList()
      return true
    } catch (err) {
      console.error('[useReadingList] Add book failed:', err)
      return false
    }
  }

  const removeBook = async (bookId: string): Promise<boolean> => {
    if (!list) return false

    // Optimistic update
    setList({
      ...list,
      books: list.books.filter(b => b.id !== bookId),
      book_count: Math.max(0, list.book_count - 1),
    })

    try {
      const response = await fetch(`/api/reading-lists/${id}/books?book_id=${bookId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        await fetchList()
        return false
      }

      return true
    } catch (err) {
      console.error('[useReadingList] Remove book failed:', err)
      await fetchList()
      return false
    }
  }

  const updateList = async (data: { title?: string; description?: string; is_public?: boolean }): Promise<boolean> => {
    if (!list) return false

    // Optimistic update
    setList({
      ...list,
      ...data,
    })

    try {
      const response = await fetch(`/api/reading-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        await fetchList()
        return false
      }

      return true
    } catch (err) {
      console.error('[useReadingList] Update failed:', err)
      await fetchList()
      return false
    }
  }

  const deleteList = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/reading-lists/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        return false
      }

      return true
    } catch (err) {
      console.error('[useReadingList] Delete failed:', err)
      return false
    }
  }

  const isOwner = list ? list.user_id === currentUserId : false

  return {
    list,
    isLoading,
    error,
    isOwner,
    follow,
    unfollow,
    addBook,
    removeBook,
    updateList,
    deleteList,
    refresh: fetchList,
  }
}
