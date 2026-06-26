'use client'

import Link from 'next/link'
import { ArrowLeft, Plus, ListTree, Loader2, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReadingLists } from '@/hooks/use-reading-lists'
import { FadeIn } from '@/components/shared/motion'
import { NewListDialog } from '@/components/reading/new-list-dialog'

export default function ReadingListsPage() {
  const { lists, isLoading, error, createList } = useReadingLists({ mine: true })

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/reading"
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  My Lists
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your curated reading lists
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/reading/lists/discover">
                <Button variant="outline" size="sm" className="gap-2">
                  <Compass className="h-4 w-4" />
                  Discover
                </Button>
              </Link>
              <NewListDialog
                onSubmit={createList}
                trigger={
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New List
                  </Button>
                }
              />
            </div>
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
        ) : lists.length === 0 ? (
          <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <ListTree className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No lists yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Create reading lists to organize and share your favorite books
            </p>
            <NewListDialog
              onSubmit={createList}
              trigger={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create your first list
                </Button>
              }
            />
          </FadeIn>
        ) : (
          <div className="space-y-4">
            {lists.map((list) => (
              <Link key={list.id} href={`/reading/lists/${list.id}`}>
                <FadeIn className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
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
                    <span>{list.follower_count} followers</span>
                    <span>{list.is_public ? 'Public' : 'Private'}</span>
                  </div>
                </FadeIn>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
