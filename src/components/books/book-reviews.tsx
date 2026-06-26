'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThumbsUp, Loader2, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { StarRating } from './book-actions'
import { FadeIn } from '@/components/shared/motion'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { BookReviewWithUser } from '@/types/database'

interface BookReviewsProps {
  bookId: string
  currentUserId?: string
}

export function BookReviews({ bookId, currentUserId }: BookReviewsProps) {
  const [reviews, setReviews] = useState<BookReviewWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newRating, setNewRating] = useState(0)
  const [newBody, setNewBody] = useState('')

  // Edit state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [editRating, setEditRating] = useState(0)
  const [editBody, setEditBody] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Delete state
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchReviews = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const params = new URLSearchParams({ limit: '10' })
      if (loadMore && cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/books/${bookId}/reviews?${params}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      if (loadMore) {
        setReviews(prev => [...prev, ...data.reviews])
      } else {
        setReviews(data.reviews)
      }

      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [bookId, cursor])

  useEffect(() => {
    fetchReviews()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newRating === 0) {
      toast.error('Please select a rating')
      return
    }

    if (newBody.trim().length < 10) {
      toast.error('Review must be at least 10 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/books/${bookId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: newRating,
          body: newBody.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setReviews(prev => [data.review, ...prev])
      setNewRating(0)
      setNewBody('')
      setShowForm(false)
      toast.success('Review submitted!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeReview = async (reviewId: string, isLiked: boolean) => {
    // Optimistic update
    setReviews(prev =>
      prev.map(review =>
        review.id === reviewId
          ? {
              ...review,
              is_liked: !isLiked,
              like_count: isLiked ? review.like_count - 1 : review.like_count + 1,
            }
          : review
      )
    )

    try {
      await fetch(`/api/books/${bookId}/reviews/${reviewId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      })
    } catch {
      // Revert
      setReviews(prev =>
        prev.map(review =>
          review.id === reviewId
            ? {
                ...review,
                is_liked: isLiked,
                like_count: isLiked ? review.like_count + 1 : review.like_count - 1,
              }
            : review
        )
      )
    }
  }

  const startEditing = (review: BookReviewWithUser) => {
    setEditingReviewId(review.id)
    setEditRating(review.rating)
    setEditBody(review.body)
  }

  const cancelEditing = () => {
    setEditingReviewId(null)
    setEditRating(0)
    setEditBody('')
  }

  const handleEditReview = async (reviewId: string) => {
    if (editRating === 0) {
      toast.error('Please select a rating')
      return
    }

    if (editBody.trim().length < 10) {
      toast.error('Review must be at least 10 characters')
      return
    }

    setIsEditing(true)

    try {
      const response = await fetch(`/api/books/${bookId}/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: editRating,
          body: editBody.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setReviews(prev =>
        prev.map(review =>
          review.id === reviewId ? data.review : review
        )
      )
      setEditingReviewId(null)
      toast.success('Review updated!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update review')
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!deleteReviewId) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/books/${bookId}/reviews/${deleteReviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      setReviews(prev => prev.filter(review => review.id !== deleteReviewId))
      toast.success('Review deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete review')
    } finally {
      setIsDeleting(false)
      setDeleteReviewId(null)
    }
  }

  // Check if user has already reviewed
  const userHasReviewed = currentUserId && reviews.some(r => r.user.id === currentUserId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Reviews ({reviews.length})
        </h2>
        {!showForm && !userHasReviewed && (
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
            Write a Review
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <FadeIn className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Your Rating
              </label>
              <StarRating
                rating={newRating}
                interactive
                onChange={setNewRating}
                size="lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Your Review
              </label>
              <Textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Share your thoughts about this book..."
                rows={4}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </form>
        </FadeIn>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isOwner = currentUserId === review.user.id
            const isEditingThis = editingReviewId === review.id

            return (
              <FadeIn
                key={review.id}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4"
              >
                {isEditingThis ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Rating
                      </label>
                      <StarRating
                        rating={editRating}
                        interactive
                        onChange={setEditRating}
                        size="lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Review
                      </label>
                      <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={4}
                        disabled={isEditing}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={isEditing}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleEditReview(review.id)}
                        disabled={isEditing}
                      >
                        {isEditing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.user.avatar_url || undefined} />
                      <AvatarFallback>
                        {review.user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {review.user.display_name || review.user.username}
                          </span>
                          {review.user.is_verified && (
                            <VerificationBadge isVerified verificationType={review.user.verification_type} />
                          )}
                        </div>
                        {isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(review)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteReviewId(review.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          {review.updated_at !== review.created_at && ' (edited)'}
                        </span>
                      </div>
                      <p className="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {review.body}
                      </p>
                      <button
                        onClick={() => handleLikeReview(review.id, review.is_liked || false)}
                        className={cn(
                          'flex items-center gap-1 mt-3 text-sm transition-colors',
                          review.is_liked
                            ? 'text-purple-500'
                            : 'text-gray-400 hover:text-purple-500'
                        )}
                      >
                        <ThumbsUp className={cn('h-4 w-4', review.is_liked && 'fill-current')} />
                        <span>{review.like_count}</span>
                      </button>
                    </div>
                  </div>
                )}
              </FadeIn>
            )
          })}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchReviews(true)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load more reviews'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteReviewId} onOpenChange={() => setDeleteReviewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteReviewId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReview}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
