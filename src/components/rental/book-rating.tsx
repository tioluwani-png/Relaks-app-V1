'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BookRatingProps {
  subscriptionId: string
  book: {
    id: string
    title: string
    author: string
    cover_url: string | null
  }
  existingRating?: {
    rating: number
    review: string | null
  } | null
  canRate: boolean // Only true if delivered_at + 3 days <= now
  onRatingSubmit?: () => void
}

export function BookRating({
  subscriptionId,
  book,
  existingRating,
  canRate,
  onRatingSubmit,
}: BookRatingProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState(existingRating?.review || '')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(Boolean(existingRating))

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/rental/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          bookId: book.id,
          rating,
          review: review.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit rating')
      }

      toast.success('Rating saved!')
      setHasSubmitted(true)
      setIsExpanded(false)
      onRatingSubmit?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayRating = hoveredRating || rating

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex gap-3">
        {/* Book cover */}
        <div className="w-14 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              width={56}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>

        {/* Book info and rating */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {book.title}
          </p>
          <p className="text-xs text-gray-500 truncate">{book.author}</p>

          {/* Star rating */}
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={!canRate || isSubmitting}
                onClick={() => {
                  setRating(star)
                  if (!isExpanded) setIsExpanded(true)
                }}
                onMouseEnter={() => canRate && setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className={cn(
                  'transition-transform',
                  canRate && 'hover:scale-110 cursor-pointer',
                  !canRate && 'cursor-default'
                )}
              >
                <Star
                  className={cn(
                    'h-5 w-5 transition-colors',
                    star <= displayRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  )}
                />
              </button>
            ))}

            {hasSubmitted && !isExpanded && (
              <span className="ml-2 text-xs text-green-600 font-medium">Rated!</span>
            )}
          </div>

          {!canRate && !hasSubmitted && (
            <p className="text-xs text-gray-400 mt-1">
              Rating available after day 3
            </p>
          )}
        </div>
      </div>

      {/* Expanded review form */}
      {isExpanded && canRate && (
        <div className="mt-4 space-y-3">
          <Textarea
            placeholder="Share your thoughts (optional)..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={500}
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{review.length}/500</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save Rating'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
