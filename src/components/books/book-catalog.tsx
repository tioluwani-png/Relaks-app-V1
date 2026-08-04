'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BookCard } from './book-card'
import { BookFilters } from './book-filters'
import { useBooks } from '@/hooks/use-books'
import { useBookGenres } from '@/hooks/use-book-genres'
import { FadeIn } from '@/components/shared/motion'
import { Library, Loader2, ArrowLeft, ArrowRight, Check, X, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { RentalPlan } from '@/types/database'

interface BookCatalogProps {
  planId?: string | null
}

export function BookCatalog({ planId }: BookCatalogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_saved' | 'most_liked'>('newest')

  // Selection mode state
  const [plan, setPlan] = useState<RentalPlan | null>(null)
  const [selectedBooks, setSelectedBooks] = useState<string[]>([])
  const [isLoadingPlan, setIsLoadingPlan] = useState(!!planId)

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

  // Load plan when in selection mode
  useEffect(() => {
    if (!planId) {
      setPlan(null)
      setSelectedBooks([])
      setIsLoadingPlan(false)
      return
    }

    async function loadPlan() {
      try {
        const res = await fetch('/api/rental/plans')
        if (res.ok) {
          const plans = await res.json()
          const currentPlan = plans.find((p: RentalPlan) => p.id === planId)
          if (currentPlan) {
            setPlan(currentPlan)
          } else {
            router.replace('/rent')
          }
        }
      } catch (err) {
        console.error('Failed to load plan:', err)
      } finally {
        setIsLoadingPlan(false)
      }
    }
    loadPlan()
  }, [planId, router])

  // Restore selection from URL
  useEffect(() => {
    const booksParam = searchParams.get('books')
    if (booksParam) {
      const bookIds = booksParam.split(',').filter(Boolean)
      setSelectedBooks(bookIds)
    }
  }, [searchParams])

  const toggleBookSelection = useCallback((bookId: string) => {
    if (!plan) return

    setSelectedBooks(prev => {
      const isSelected = prev.includes(bookId)
      let newSelection: string[]

      if (isSelected) {
        newSelection = prev.filter(id => id !== bookId)
      } else {
        if (prev.length >= plan.books_per_cycle) {
          return prev
        }
        newSelection = [...prev, bookId]
      }

      // Update URL params
      const params = new URLSearchParams(searchParams.toString())
      if (newSelection.length > 0) {
        params.set('books', newSelection.join(','))
      } else {
        params.delete('books')
      }
      window.history.replaceState(null, '', `?${params.toString()}`)

      return newSelection
    })
  }, [plan, searchParams])

  const handleContinue = () => {
    if (!plan || selectedBooks.length !== plan.books_per_cycle) return

    const params = new URLSearchParams()
    params.set('plan', planId!)
    params.set('books', selectedBooks.join(','))
    router.push(`/rent/checkout?${params.toString()}`)
  }

  const clearSelection = () => {
    setSelectedBooks([])
    const params = new URLSearchParams(searchParams.toString())
    params.delete('books')
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

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

  const isSelectionMode = !!plan
  const selectedBookDetails = books.filter(b => selectedBooks.includes(b.id))

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (isLoadingPlan) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', isSelectionMode && 'pb-32')}>
      {/* Selection mode banner */}
      {isSelectionMode && plan && (
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Link
              href="/rent"
              className="p-2 -ml-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="font-bold text-lg">{plan.name} Plan</h2>
              <p className="text-white/80 text-sm">
                Select {plan.books_per_cycle} books for your subscription
              </p>
            </div>
          </div>
        </div>
      )}

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
            {books.map((book, index) => {
              const isSelected = selectedBooks.includes(book.id)
              const isDisabled = isSelectionMode && !isSelected && selectedBooks.length >= (plan?.books_per_cycle || 0)

              return (
                <FadeIn key={book.id} delay={index * 0.05}>
                  {isSelectionMode ? (
                    <SelectableBookCard
                      book={book}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onToggle={() => toggleBookSelection(book.id)}
                    />
                  ) : (
                    <BookCard book={book} />
                  )}
                </FadeIn>
              )
            })}
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

      {/* Selection bar (fixed at bottom) */}
      {isSelectionMode && plan && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              {/* Selected books thumbnails */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="flex -space-x-2">
                  {selectedBookDetails.slice(0, 5).map(book => (
                    <div
                      key={book.id}
                      className="w-10 h-14 rounded-lg overflow-hidden border-2 border-white dark:border-gray-900 bg-gray-100 shrink-0"
                    >
                      {book.cover_url ? (
                        <Image
                          src={book.cover_url}
                          alt={book.title}
                          width={40}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, plan.books_per_cycle - selectedBooks.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="w-10 h-14 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 shrink-0 flex items-center justify-center"
                    >
                      <span className="text-gray-300 dark:text-gray-600 text-lg">+</span>
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">
                  {selectedBooks.length} of {plan.books_per_cycle}
                </span>
              </div>

              {/* Clear button */}
              {selectedBooks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-gray-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}

              {/* Continue button */}
              <Button
                onClick={handleContinue}
                disabled={selectedBooks.length !== plan.books_per_cycle}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Selectable book card for selection mode
interface SelectableBookCardProps {
  book: {
    id: string
    title: string
    author: string
    cover_url: string | null
    genre?: { name: string; color: string } | null
  }
  isSelected: boolean
  isDisabled: boolean
  onToggle: () => void
}

function SelectableBookCard({ book, isSelected, isDisabled, onToggle }: SelectableBookCardProps) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={isDisabled}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden text-left transition-all w-full',
        isSelected
          ? 'ring-2 ring-purple-500 shadow-lg'
          : 'border border-gray-100 dark:border-gray-800 hover:shadow-md',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Cover */}
      <div className="aspect-[2/3] relative bg-gray-100 dark:bg-gray-800">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
            <span className="text-4xl font-bold text-purple-300 dark:text-purple-700">
              {book.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Genre badge */}
        {book.genre && (
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: book.genre.color }}
          >
            {book.genre.name}
          </div>
        )}

        {/* Selected indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-lg"
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
          {book.author}
        </p>
      </div>
    </motion.button>
  )
}
