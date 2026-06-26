'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThumbsUp, Loader2, MessageSquare, Reply, ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { FadeIn } from '@/components/shared/motion'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { BookCommentWithUser } from '@/types/database'

interface BookCommentsProps {
  bookId: string
}

export function BookComments({ bookId }: BookCommentsProps) {
  const [comments, setComments] = useState<BookCommentWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())

  const fetchComments = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const params = new URLSearchParams({ limit: '20' })
      if (loadMore && cursor) params.set('cursor', cursor)

      const response = await fetch(`/api/books/${bookId}/comments?${params}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      if (loadMore) {
        setComments(prev => [...prev, ...data.comments])
      } else {
        setComments(data.comments)
      }

      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [bookId, cursor])

  useEffect(() => {
    fetchComments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newComment.trim().length < 2) {
      toast.error('Comment must be at least 2 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/books/${bookId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setComments(prev => [{ ...data.comment, replies: [] }, ...prev])
      setNewComment('')
      setShowForm(false)
      toast.success('Comment posted!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (replyContent.trim().length < 2) {
      toast.error('Reply must be at least 2 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/books/${bookId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          parent_id: parentId,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      // Add reply to the parent comment
      setComments(prev =>
        prev.map(comment =>
          comment.id === parentId
            ? { ...comment, replies: [...(comment.replies || []), data.comment] }
            : comment
        )
      )

      setReplyContent('')
      setReplyingTo(null)
      setExpandedReplies(prev => new Set(prev).add(parentId))
      toast.success('Reply posted!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string, isLiked: boolean, parentId?: string) => {
    // Optimistic update
    if (parentId) {
      setComments(prev =>
        prev.map(comment =>
          comment.id === parentId
            ? {
                ...comment,
                replies: (comment.replies || []).map(reply =>
                  reply.id === commentId
                    ? {
                        ...reply,
                        is_liked: !isLiked,
                        like_count: isLiked ? reply.like_count - 1 : reply.like_count + 1,
                      }
                    : reply
                ),
              }
            : comment
        )
      )
    } else {
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                is_liked: !isLiked,
                like_count: isLiked ? comment.like_count - 1 : comment.like_count + 1,
              }
            : comment
        )
      )
    }

    try {
      await fetch(`/api/books/${bookId}/comments/${commentId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      })
    } catch {
      // Revert on error
      if (parentId) {
        setComments(prev =>
          prev.map(comment =>
            comment.id === parentId
              ? {
                  ...comment,
                  replies: (comment.replies || []).map(reply =>
                    reply.id === commentId
                      ? {
                          ...reply,
                          is_liked: isLiked,
                          like_count: isLiked ? reply.like_count + 1 : reply.like_count - 1,
                        }
                      : reply
                  ),
                }
              : comment
          )
        )
      } else {
        setComments(prev =>
          prev.map(comment =>
            comment.id === commentId
              ? {
                  ...comment,
                  is_liked: isLiked,
                  like_count: isLiked ? comment.like_count + 1 : comment.like_count - 1,
                }
              : comment
          )
        )
      }
    }
  }

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const CommentItem = ({
    comment,
    isReply = false,
    parentId,
  }: {
    comment: BookCommentWithUser
    isReply?: boolean
    parentId?: string
  }) => (
    <div className={cn('flex gap-3', isReply && 'ml-10 mt-3')}>
      <Avatar className={cn(isReply ? 'h-8 w-8' : 'h-10 w-10')}>
        <AvatarImage src={comment.user.avatar_url || undefined} />
        <AvatarFallback className={isReply ? 'text-xs' : ''}>
          {comment.user.username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {comment.user.display_name || comment.user.username}
          </span>
          {comment.user.is_verified && (
            <VerificationBadge isVerified verificationType={comment.user.verification_type} />
          )}
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="mt-1 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
          {comment.content}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => handleLikeComment(comment.id, comment.is_liked || false, parentId)}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              comment.is_liked
                ? 'text-purple-500'
                : 'text-gray-400 hover:text-purple-500'
            )}
          >
            <ThumbsUp className={cn('h-3.5 w-3.5', comment.is_liked && 'fill-current')} />
            <span>{comment.like_count}</span>
          </button>
          {!isReply && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {/* Reply Form */}
        {replyingTo === comment.id && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="text-sm"
              disabled={isSubmitting}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyingTo(null)
                  setReplyContent('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Reply'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Discussion ({comments.length})
        </h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
            Add Comment
          </Button>
        )}
      </div>

      {/* Comment Form */}
      {showForm && (
        <FadeIn className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              disabled={isSubmitting}
            />
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
                    Posting...
                  </>
                ) : (
                  'Post Comment'
                )}
              </Button>
            </div>
          </form>
        </FadeIn>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No comments yet. Start the discussion!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <FadeIn
              key={comment.id}
              className="bg-white dark:bg-gray-900 rounded-2xl p-4"
            >
              <CommentItem comment={comment} />

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 transition-colors ml-10"
                  >
                    {expandedReplies.has(comment.id) ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </>
                    )}
                  </button>

                  {expandedReplies.has(comment.id) && (
                    <div className="space-y-3 mt-3">
                      {comment.replies.map((reply) => (
                        <CommentItem
                          key={reply.id}
                          comment={reply}
                          isReply
                          parentId={comment.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </FadeIn>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchComments(true)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load more comments'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
