'use client'

import { useState } from 'react'
import { Loader2, BookPlus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RequestCard } from './request-card'
import { NewRequestDialog } from './new-request-dialog'
import { FadeIn } from '@/components/shared/motion'
import { useBookRequests } from '@/hooks/use-book-requests'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'fulfilled'
type SortOption = 'votes' | 'newest'

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
]

export function RequestsContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [sortBy, setSortBy] = useState<SortOption>('votes')

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
    status: statusFilter,
    sort: sortBy,
    limit: 20,
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === tab.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort & New Request */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                {sortBy === 'votes' ? 'Most Voted' : 'Newest'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('votes')}>
                Most Voted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('newest')}>
                Newest
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NewRequestDialog onSubmit={createRequest} />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : requests.length === 0 ? (
        <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
            <BookPlus className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No requests yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            {statusFilter === 'all'
              ? "Be the first to request a book you'd like to see added!"
              : `No ${statusFilter} requests at the moment`}
          </p>
          {statusFilter !== 'all' && (
            <Button
              variant="outline"
              onClick={() => setStatusFilter('all')}
            >
              View all requests
            </Button>
          )}
        </FadeIn>
      ) : (
        <>
          <div className="space-y-4">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onVote={vote}
                onUnvote={unvote}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
