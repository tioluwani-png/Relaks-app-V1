'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, BookOpen, Check, Loader2, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RentalPlan, RentalBook } from '@/types/database'
import { cn } from '@/lib/utils'

const GENRES = [
  { value: 'all', label: 'All' },
  { value: 'fiction', label: 'Fiction' },
  { value: 'non-fiction', label: 'Non-Fiction' },
  { value: 'romance', label: 'Romance' },
  { value: 'self-help', label: 'Self-Help' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'fantasy', label: 'Fantasy' },
]

function CatalogueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')

  const [plan, setPlan] = useState<RentalPlan | null>(null)
  const [books, setBooks] = useState<RentalBook[]>([])
  const [selectedBooks, setSelectedBooks] = useState<string[]>([])
  const [activeGenre, setActiveGenre] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if no plan
  useEffect(() => {
    if (!planId) {
      router.replace('/rent')
    }
  }, [planId, router])

  // Load plan and books
  useEffect(() => {
    async function loadData() {
      if (!planId) return

      try {
        // Load plan
        const plansRes = await fetch('/api/rental/plans')
        if (plansRes.ok) {
          const plans = await plansRes.json()
          const currentPlan = plans.find((p: RentalPlan) => p.id === planId)
          if (currentPlan) {
            setPlan(currentPlan)
          } else {
            router.replace('/rent')
            return
          }
        }

        // Load books
        const booksRes = await fetch('/api/rental/books')
        if (booksRes.ok) {
          const booksData = await booksRes.json()
          setBooks(booksData)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [planId, router])

  // Restore selection from URL
  useEffect(() => {
    const booksParam = searchParams.get('books')
    if (booksParam) {
      const bookIds = booksParam.split(',').filter(Boolean)
      setSelectedBooks(bookIds)
    }
  }, [searchParams])

  const toggleBook = useCallback((bookId: string) => {
    setSelectedBooks(prev => {
      const isSelected = prev.includes(bookId)
      let newSelection: string[]

      if (isSelected) {
        newSelection = prev.filter(id => id !== bookId)
      } else {
        // Check limit
        if (plan && prev.length >= plan.books_per_cycle) {
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

  const filteredBooks = activeGenre === 'all'
    ? books
    : books.filter(book => book.genre?.toLowerCase() === activeGenre)

  const selectedBookDetails = books.filter(b => selectedBooks.includes(b.id))

  const handleContinue = () => {
    if (!plan || selectedBooks.length !== plan.books_per_cycle) return

    const params = new URLSearchParams()
    params.set('plan', planId!)
    params.set('books', selectedBooks.join(','))
    router.push(`/rent/checkout?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!plan) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/rent" className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Choose Your Books</h1>
              <p className="text-sm text-gray-500">
                {plan.name} Plan - Select {plan.books_per_cycle} books
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Genre filters */}
      <div className="sticky top-[73px] z-30 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {GENRES.map(genre => (
              <button
                key={genre.value}
                onClick={() => setActiveGenre(genre.value)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeGenre === genre.value
                    ? 'bg-purple-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                )}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Books grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No books available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredBooks.map(book => {
              const isSelected = selectedBooks.includes(book.id)
              const isDisabled = !isSelected && selectedBooks.length >= plan.books_per_cycle

              return (
                <motion.button
                  key={book.id}
                  onClick={() => toggleBook(book.id)}
                  disabled={isDisabled}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative bg-white rounded-2xl overflow-hidden text-left transition-all',
                    isSelected
                      ? 'ring-2 ring-purple-500 shadow-lg'
                      : 'border border-gray-100 hover:shadow-md',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {/* Cover */}
                  <div className="aspect-[2/3] relative bg-gray-100">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-300" />
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
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {book.author}
                    </p>
                    {book.genre && (
                      <span className="mt-2 inline-block px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded-full">
                        {book.genre}
                      </span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selection bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Selected books thumbnails */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="flex -space-x-2">
                {selectedBookDetails.slice(0, 5).map(book => (
                  <div
                    key={book.id}
                    className="w-10 h-14 rounded-lg overflow-hidden border-2 border-white bg-gray-100 shrink-0"
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
                    className="w-10 h-14 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 shrink-0 flex items-center justify-center"
                  >
                    <span className="text-gray-300 text-lg">+</span>
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-600 shrink-0">
                {selectedBooks.length} of {plan.books_per_cycle}
              </span>
            </div>

            {/* Clear button */}
            {selectedBooks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBooks([])
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete('books')
                  window.history.replaceState(null, '', `?${params.toString()}`)
                }}
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
    </div>
  )
}

export default function CataloguePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <CatalogueContent />
    </Suspense>
  )
}
