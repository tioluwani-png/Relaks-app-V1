'use client'

import Link from 'next/link'
import { ArrowLeft, Users, Loader2, Search, Globe } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { FadeIn } from '@/components/shared/motion'
import { useReadingLists } from '@/hooks/use-reading-lists'

export default function DiscoverListsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { lists, isLoading, isLoadingMore, hasMore, loadMore, error } = useReadingLists({
    limit: 20,
  })

  // Filter lists by search query (client-side for now)
  const filteredLists = searchQuery.trim()
    ? lists.filter(
        list =>
          list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          list.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          list.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          list.user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : lists

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/reading/lists"
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Discover Lists
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Explore public reading lists from the community
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lists..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : filteredLists.length === 0 ? (
          <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No lists found' : 'No public lists yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'Be the first to create a public reading list!'}
            </p>
          </FadeIn>
        ) : (
          <div className="space-y-4">
            {filteredLists.map((list) => (
              <Link key={list.id} href={`/reading/lists/${list.id}`}>
                <FadeIn className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {list.title}
                      </h3>
                      {list.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>{list.book_count} books</span>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{list.follower_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={list.user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {list.user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {list.user.display_name || list.user.username}
                    </span>
                    {list.user.is_verified && (
                      <VerificationBadge isVerified verificationType={list.user.verification_type} />
                    )}
                  </div>
                </FadeIn>
              </Link>
            ))}

            {hasMore && !searchQuery && (
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
          </div>
        )}
      </div>
    </div>
  )
}
