'use client'

import { useState } from 'react'
import { Heart, Bookmark, BookOpen, Check, X, Star, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { ReadingStatus } from '@/types/database'

interface BookActionsProps {
  bookId: string
  isLiked: boolean
  isSaved: boolean
  isInCart?: boolean
  readStatus: ReadingStatus | null
  likeCount: number
  saveCount: number
  onLike: () => Promise<void>
  onSave: () => Promise<void>
  onReadStatusChange: (status: ReadingStatus) => Promise<void>
  onAddToCart?: () => Promise<void>
  showCartButton?: boolean
}

const readingStatusLabels: Record<ReadingStatus, { label: string; icon: React.ReactNode }> = {
  want_to_read: { label: 'Want to Read', icon: <BookOpen className="h-4 w-4" /> },
  reading: { label: 'Currently Reading', icon: <BookOpen className="h-4 w-4" /> },
  read: { label: 'Read', icon: <Check className="h-4 w-4" /> },
  dnf: { label: 'Did Not Finish', icon: <X className="h-4 w-4" /> },
}

export function BookActions({
  bookId,
  isLiked,
  isSaved,
  isInCart = false,
  readStatus,
  likeCount,
  saveCount,
  onLike,
  onSave,
  onReadStatusChange,
  onAddToCart,
  showCartButton = true,
}: BookActionsProps) {
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isSaveLoading, setIsSaveLoading] = useState(false)
  const [isCartLoading, setIsCartLoading] = useState(false)

  const handleLike = async () => {
    if (isLikeLoading) return
    setIsLikeLoading(true)
    try {
      await onLike()
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleSave = async () => {
    if (isSaveLoading) return
    setIsSaveLoading(true)
    try {
      await onSave()
    } finally {
      setIsSaveLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (isCartLoading || !onAddToCart || isInCart) return
    setIsCartLoading(true)
    try {
      await onAddToCart()
    } finally {
      setIsCartLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Like Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleLike}
        disabled={isLikeLoading}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
          isLiked
            ? 'bg-red-50 dark:bg-red-950/30 text-red-500'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        )}
      >
        <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
        <span>{likeCount}</span>
      </motion.button>

      {/* Save Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSave}
        disabled={isSaveLoading}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
          isSaved
            ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-500'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        )}
      >
        <Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />
        <span>{saveCount}</span>
      </motion.button>

      {/* Cart Button */}
      {showCartButton && onAddToCart && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleAddToCart}
          disabled={isCartLoading || isInCart}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
            isInCart
              ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
          )}
        >
          <ShoppingCart className={cn('h-5 w-5', isInCart && 'fill-current')} />
          <span>{isInCart ? 'In Cart' : 'Rent'}</span>
        </motion.button>
      )}

      {/* Reading Status Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'gap-2',
              readStatus && 'border-green-500 text-green-600 dark:text-green-400'
            )}
          >
            {readStatus ? (
              <>
                {readingStatusLabels[readStatus].icon}
                {readingStatusLabels[readStatus].label}
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                Add to Shelf
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {(Object.keys(readingStatusLabels) as ReadingStatus[]).map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => onReadStatusChange(status)}
              className={cn(
                'flex items-center gap-2',
                readStatus === status && 'bg-green-50 dark:bg-green-950/30 text-green-600'
              )}
            >
              {readingStatusLabels[status].icon}
              {readingStatusLabels[status].label}
              {readStatus === status && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(maxRating)].map((_, i) => {
        const starValue = i + 1
        const isFilled = interactive
          ? starValue <= (hoverRating || rating)
          : starValue <= rating

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={cn(
              'transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              isFilled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            )}
          >
            <Star className={cn(sizeClasses[size], isFilled && 'fill-current')} />
          </button>
        )
      })}
    </div>
  )
}
