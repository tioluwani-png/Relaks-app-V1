'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BookCard } from './book-card'
import { BookFilters } from './book-filters'
import { useBooks } from '@/hooks/use-books'
import { useBookGenres } from '@/hooks/use-book-genres'
import { FadeIn } from '@/components/shared/motion'
import { Library, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

export function BookCatalog() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_saved' | 'most_liked'>('newest')

  const debouncedSearch = useDebounce(searchInput, 300)

  const { genres, isLoading: genresLoading } = useBookGenres()
  const {
    books,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useBooks({
    genre: selectedGenre || undefined,
    search: debouncedSearch || undefined,
    sort: sortBy,
    limit: 20,
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
      {/* Filters */}
      <BookFilters
        genres={genres}
        selectedGenre={selectedGenre}
        searchQuery={searchInput}
        sortBy={sortBy}
        onGenreChange={setSelectedGenre}
        onSearchChange={setSearchInput}
        onSortChange={setSortBy}
      />

      {/* Books Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
            <Library className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No books found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            {debouncedSearch
              ? `No books matching "${debouncedSearch}"`
              : selectedGenre
                ? 'No books in this genre yet'
                : 'Books will appear here once added'}
          </p>
        </FadeIn>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {books.map((book, index) => (
              <FadeIn key={book.id} delay={index * 0.05}>
                <BookCard book={book} />
              </FadeIn>
            ))}
          </div>

          {/* Load More Trigger */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-8"
            >
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
