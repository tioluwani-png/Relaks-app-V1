'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PostWithUser } from '@/types/database'

interface UsePostsOptions {
  following?: boolean
  limit?: number
}

interface UsePostsReturn {
  posts: PostWithUser[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function usePosts(options: UsePostsOptions = {}): UsePostsReturn {
  const { following = false, limit = 10 } = options
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchPosts = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        following: following.toString(),
      })

      if (loadMore && cursor) {
        params.set('cursor', cursor)
      }

      const response = await fetch(`/api/posts?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch posts')
      }

      if (loadMore) {
        setPosts(prev => [...prev, ...data.posts])
      } else {
        setPosts(data.posts)
      }

      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [following, limit, cursor])

  useEffect(() => {
    fetchPosts()
  }, [following]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!isLoadingMore && hasMore) {
      await fetchPosts(true)
    }
  }

  const refresh = async () => {
    setCursor(null)
    setHasMore(true)
    await fetchPosts(false)
  }

  return {
    posts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}

export function usePost(id: string) {
  const [post, setPost] = useState<PostWithUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/posts/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch post')
        }

        setPost(data.post)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [id])

  const likePost = async () => {
    if (!post) return

    const isLiked = post.is_liked

    // Optimistic update
    setPost({
      ...post,
      is_liked: !isLiked,
      like_count: isLiked ? post.like_count - 1 : post.like_count + 1,
    })

    try {
      const response = await fetch(`/api/posts/${id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        // Revert on error
        setPost({
          ...post,
          is_liked: isLiked,
          like_count: post.like_count,
        })
      }
    } catch {
      // Revert on error
      setPost({
        ...post,
        is_liked: isLiked,
        like_count: post.like_count,
      })
    }
  }

  return {
    post,
    isLoading,
    error,
    likePost,
  }
}
