'use client'

import { useCallback, useRef } from 'react'
import { BookRequestCard } from './book-request-card'
import { BookRequestForm } from './book-request-form'
import { useBookRequests } from '@/hooks/use-book-requests'
import { FadeIn } from '@/components/shared/motion'
import { BookPlus, Loader2 } from 'lucide-react'

export function BookRequestsList() {
  const {
    requests,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    vote,
    unvote,
    createRequest,
  } = useBookRequests({
    status: 'pending',
    sort: 'votes',
  })

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingMore) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [isLoadingMore, hasMore, loadMore]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with request form */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Community Requests
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vote for books you want to see added
          </p>
        </div>
        <BookRequestForm onSubmit={createRequest} />
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl">
              <div className="w-16 h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
            <BookPlus className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No requests yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Be the first to request a book you'd like to see in our collection!
          </p>
        </FadeIn>
      ) : (
        <>
          <div className="space-y-3">
            {requests.map((request) => (
              <BookRequestCard
                key={request.id}
                request={request}
                onVote={vote}
                onUnvote={unvote}
              />
            ))}
          </div>

          {/* Load More Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isLoadingMore && (
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
