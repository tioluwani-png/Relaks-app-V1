'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PostCard } from './post-card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePosts } from '@/hooks/use-posts'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const tabs = [
  { value: 'latest', label: 'Latest' },
  { value: 'following', label: 'Following' },
]

export function FeedContent() {
  const [activeTab, setActiveTab] = useState('latest')

  return (
    <div className="px-4 py-4">
      {/* Custom pill tab switcher */}
      <div className="flex gap-2 p-1 bg-muted rounded-2xl">
        {tabs.map((tab) => (
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
                className="absolute inset-0 rounded-xl gradient-purple-pink"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <FeedList following={activeTab === 'following'} />
      </div>
    </div>
  )
}

function FeedList({ following }: { following: boolean }) {
  const { posts, isLoading, isLoadingMore, hasMore, loadMore } = usePosts({ following })
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !isLoadingMore) {
        loadMore()
      }
    },
    [hasMore, isLoadingMore, loadMore]
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
            <div className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="mx-3">
              <Skeleton className="aspect-square w-full rounded-xl animate-shimmer" />
            </div>
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 mx-auto rounded-2xl gradient-purple-pink flex items-center justify-center mb-4">
          <span className="text-2xl">🎨</span>
        </div>
        <h3 className="font-semibold mb-2">No posts yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {following
            ? 'Follow some users to see their posts here!'
            : 'Be the first to share your colored artwork!'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post as Parameters<typeof PostCard>[0]['post']} />
      ))}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin text-purple-500" />}
      </div>
    </div>
  )
}
