'use client'

import { useWishlist } from '@/hooks/use-wishlist'
import { BookCard } from '@/components/books/book-card'
import { FadeIn } from '@/components/shared/motion'
import { Bookmark, Loader2 } from 'lucide-react'

export function WishlistContent() {
  const { books, isLoading, error } = useWishlist()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <FadeIn className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
          <Bookmark className="h-8 w-8 text-purple-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Your wishlist is empty
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Save books you want to read later by tapping the bookmark icon
        </p>
      </FadeIn>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {books.map((book, index) => (
        <FadeIn key={book.id} delay={index * 0.05}>
          <BookCard book={book} />
        </FadeIn>
      ))}
    </div>
  )
}
