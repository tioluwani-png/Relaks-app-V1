'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { PostCard } from './post-card'
import { YourEditionCard } from './your-edition-card'
import { EditionPickerCard } from './edition-picker-card'
import { PromoCard } from './promo-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface PostWithUser {
  id: string
  image_url: string
  caption: string | null
  edition?: string | null
  page_number?: number | null
  like_count: number
  comment_count: number
  created_at: string
  is_liked?: boolean
  is_saved?: boolean
  first_comment?: {
    id: string
    content: string
    user: { username: string }
  } | null
  user: {
    username: string
    display_name: string | null
    avatar_url: string | null
    is_verified?: boolean
    verification_type?: string | null
  }
}

type FeedTab = 'for_you' | 'following' | 'my_edition'

export function FeedContent() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<FeedTab>('for_you')

  // Check if user owns any editions
  const userEditions = (profile?.editions_owned as string[]) || []
  const hasEditions = userEditions.length > 0

  const tabs: { value: FeedTab; label: string; hidden?: boolean }[] = [
    { value: 'for_you', label: 'For you' },
    { value: 'following', label: 'Following' },
    { value: 'my_edition', label: 'My edition', hidden: !hasEditions },
  ]

  const visibleTabs = tabs.filter(t => !t.hidden)

  return (
    <div className="px-4 py-4">
      {/* Edition Picker for existing users who haven't set editions */}
      <EditionPickerCard />

      {/* Your Edition Card */}
      <YourEditionCard />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-2xl mb-4">
        {visibleTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'relative flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors',
              activeTab === tab.value
                ? 'text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {activeTab === tab.value && (
              <motion.div
                layoutId="feed-tab-indicator"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Feed list */}
      <FeedList
        tab={activeTab}
        userEditions={userEditions}
      />
    </div>
  )
}

function FeedList({ tab, userEditions }: { tab: FeedTab; userEditions: string[] }) {
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [followSuggestions, setFollowSuggestions] = useState<{
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }[]>([])

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setCursor(null)
    }

    try {
      const params = new URLSearchParams({ limit: '10' })

      if (tab === 'following') {
        params.set('following', 'true')
      } else if (tab === 'my_edition' && userEditions.length > 0) {
        params.set('edition', userEditions[0])
      }

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
      console.error('[FeedList] Error:', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [tab, cursor, userEditions])

  // Fetch follow suggestions for empty following tab
  const fetchFollowSuggestions = useCallback(async () => {
    if (tab !== 'following' || posts.length > 0) return

    try {
      const editionParam = userEditions.length > 0 ? `?edition=${userEditions[0]}` : ''
      const response = await fetch(`/api/users/suggestions${editionParam}`)
      if (response.ok) {
        const data = await response.json()
        setFollowSuggestions(data.users || [])
      }
    } catch (err) {
      console.error('[FeedList] Error fetching suggestions:', err)
    }
  }, [tab, posts.length, userEditions])

  useEffect(() => {
    fetchPosts()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading && posts.length === 0 && tab === 'following') {
      fetchFollowSuggestions()
    }
  }, [isLoading, posts.length, tab, fetchFollowSuggestions])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !isLoadingMore) {
        fetchPosts(true)
      }
    },
    [hasMore, isLoadingMore, fetchPosts]
  )

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    })

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleObserver])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="mx-3">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            </div>
            <div className="p-3 space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state for Following tab
  if (posts.length === 0 && tab === 'following') {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
          <UserPlus className="h-8 w-8 text-purple-500" />
        </div>
        <h3 className="font-semibold mb-2">
          {userEditions.length > 0
            ? `Follow colorists who own ${userEditions[0]}`
            : 'Follow some colorists'}
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
          See their artwork in your feed
        </p>

        {followSuggestions.length > 0 && (
          <div className="space-y-3 text-left max-w-sm mx-auto">
            {followSuggestions.map(user => (
              <FollowSuggestionRow key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Empty state for other tabs
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
          <span className="text-2xl">🎨</span>
        </div>
        <h3 className="font-semibold mb-2">No posts yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {tab === 'my_edition'
            ? 'Be the first to share artwork from your edition!'
            : 'Be the first to share your colored artwork!'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <div key={post.id}>
          <PostCard post={post as Parameters<typeof PostCard>[0]['post']} />
          {/* Show promo card every 8 posts */}
          {index > 0 && index % 8 === 7 && <div className="mt-4"><PromoCard index={index} /></div>}
        </div>
      ))}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin text-purple-500" />}
      </div>
    </div>
  )
}

function FollowSuggestionRow({ user }: {
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null }
}) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleFollow = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.username}/follow`, {
        method: 'POST',
      })
      if (response.ok) {
        setIsFollowing(true)
        toast.success(`Following ${user.display_name || user.username}!`)
      } else {
        toast.error('Failed to follow. Try again.')
      }
    } catch (err) {
      console.error('[FollowSuggestionRow] Error:', err)
      toast.error('Failed to follow. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl">
      <Link href={`/user/${user.username}`}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/user/${user.username}`} className="font-medium text-sm hover:underline truncate block">
          {user.display_name || user.username}
        </Link>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
      </div>
      <Button
        size="sm"
        variant={isFollowing ? 'outline' : 'default'}
        onClick={handleFollow}
        disabled={isLoading || isFollowing}
        className="rounded-full"
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    </div>
  )
}
