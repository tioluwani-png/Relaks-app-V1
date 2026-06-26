'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Share2, BookOpen, Calendar, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookActions, StarRating } from './book-actions'
import { useBook } from '@/hooks/use-book'
import { useCartStore, formatPrice, BOOK_RENTAL_PRICE } from '@/stores/cart-store'
import { FadeIn } from '@/components/shared/motion'
import { toast } from 'sonner'
import type { ReadingStatus } from '@/types/database'

interface BookDetailProps {
  bookId: string
}

export function BookDetail({ bookId }: BookDetailProps) {
  const {
    book,
    isLoading,
    error,
    likeBook,
    saveBook,
    updateReadStatus,
  } = useBook(bookId)

  const { isInCart, addToCart, fetchCart, isInitialized } = useCartStore()

  // Fetch cart on mount
  useEffect(() => {
    if (!isInitialized) {
      fetchCart()
    }
  }, [fetchCart, isInitialized])

  const handleAddToCart = async () => {
    const success = await addToCart(bookId)
    if (success) {
      toast.success('Added to cart!')
    } else {
      toast.error('Failed to add to cart')
    }
  }

  const handleShare = async () => {
    if (navigator.share && book) {
      await navigator.share({
        title: `${book.title} by ${book.author}`,
        text: `Check out "${book.title}" on Relaks Reading Club`,
        url: window.location.href,
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  const handleReadStatusChange = async (status: ReadingStatus) => {
    await updateReadStatus(status)
    toast.success(`Marked as "${status.replace('_', ' ')}"`)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex gap-6">
          <div className="w-40 h-60 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-full" />
          </div>
        </div>
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-500 mb-4">{error || 'Book not found'}</p>
        <Link href="/books">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Books
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <FadeIn className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/books"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={handleShare}>
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Book Header */}
      <div className="flex gap-6">
        {/* Cover */}
        <div className="shrink-0 relative w-32 sm:w-40 aspect-[2/3] rounded-xl overflow-hidden shadow-lg">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
              <span className="text-5xl font-bold text-purple-300 dark:text-purple-700">
                {book.title.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {book.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
            by {book.author}
          </p>

          {/* Genre Badge */}
          {book.genre && (
            <Link
              href={`/books?genre=${book.genre.slug}`}
              className="inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: book.genre.color }}
            >
              {book.genre.name}
            </Link>
          )}

          {/* Rating */}
          {book.review_count > 0 && book.average_rating && (
            <div className="flex items-center gap-2 mt-3">
              <StarRating rating={Math.round(book.average_rating)} size="sm" />
              <span className="text-sm text-gray-500">
                {book.average_rating.toFixed(1)} ({book.review_count} {book.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            {book.page_count && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{book.page_count} pages</span>
              </div>
            )}
            {book.published_year && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{book.published_year}</span>
              </div>
            )}
            {book.isbn && (
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                <span>ISBN: {book.isbn}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <BookActions
        bookId={book.id}
        isLiked={book.is_liked || false}
        isSaved={book.is_saved || false}
        isInCart={isInCart(bookId)}
        readStatus={book.user_read_status || null}
        likeCount={book.like_count}
        saveCount={book.save_count}
        onLike={likeBook}
        onSave={saveBook}
        onReadStatusChange={handleReadStatusChange}
        onAddToCart={handleAddToCart}
        showCartButton={true}
      />

      {/* Rental Price Info */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-purple-600 dark:text-purple-400">Rent this book:</span>{' '}
          {formatPrice(BOOK_RENTAL_PRICE)} / rental
        </p>
      </div>

      {/* Description */}
      {book.description && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            About this book
          </h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
            {book.description}
          </p>
        </div>
      )}
    </FadeIn>
  )
}
