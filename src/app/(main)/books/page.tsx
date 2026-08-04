'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookCatalog } from '@/components/books/book-catalog'
import { Loader2 } from 'lucide-react'

function BooksPageContent() {
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reading Club
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {planId ? 'Select your books' : 'Discover your next favorite read'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <BookCatalog planId={planId} />
      </div>
    </div>
  )
}

export default function BooksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <BooksPageContent />
    </Suspense>
  )
}
