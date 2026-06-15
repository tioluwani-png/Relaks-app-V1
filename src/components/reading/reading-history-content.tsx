'use client'

import { useState } from 'react'
import { useReadingHistory } from '@/hooks/use-reading-history'
import { BookCard } from '@/components/books/book-card'
import { FadeIn } from '@/components/shared/motion'
import { BookOpen, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReadingStatus } from '@/types/database'

const statusTabs: { label: string; value: ReadingStatus | 'all' }[] = [
  { label: 'All', value: 'all' as const },
  { label: 'Reading', value: 'reading' },
  { label: 'Read', value: 'read' },
  { label: 'Want to Read', value: 'want_to_read' },
  { label: 'DNF', value: 'dnf' },
]

export function ReadingHistoryContent() {
  const [activeStatus, setActiveStatus] = useState<ReadingStatus | 'all'>('all')

  const { books, isLoading, error } = useReadingHistory({
    status: activeStatus === 'all' ? undefined : activeStatus,
  })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeStatus === tab.value
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Books Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : books.length === 0 ? (
        <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-pink-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No books here yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Start tracking your reading by marking books as reading, read, or want to read
          </p>
        </FadeIn>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {books.map((book, index) => (
            <FadeIn key={book.id} delay={index * 0.05}>
              <BookCard book={book} />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  )
}
