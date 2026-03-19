'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Send, LogIn, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import type { BlogCommentWithUser } from '@/types/database'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return date.toLocaleDateString()
}

function BlogCommentItem({
  comment,
  slug,
  depth = 0,
  onReplyAdded,
}: {
  comment: BlogCommentWithUser
  slug: string
  depth?: number
  onReplyAdded: () => void
}) {
  const { profile } = useAuth()
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [liked, setLiked] = useState(comment.is_liked || false)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [isLiking, setIsLiking] = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  const handleLike = async () => {
    if (!profile || isLiking) return
    setIsLiking(true)

    const wasLiked = liked
    // Optimistic update
    setLiked(!wasLiked)
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1))

    try {
      const res = await fetch(`/api/blog/comments/${comment.id}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      })
      if (!res.ok) {
        // Revert on error
        setLiked(wasLiked)
        setLikeCount((c) => (wasLiked ? c + 1 : c - 1))
      }
    } catch (err) {
      console.error('[BlogCommentLike] Failed to toggle like:', err)
      setLiked(wasLiked)
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1))
    } finally {
      setIsLiking(false)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/blog/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim(), parent_id: comment.id }),
      })

      if (res.ok) {
        setReplyContent('')
        setIsReplying(false)
        onReplyAdded()
      }
    } catch (err) {
      console.error('[BlogComment] Failed to post reply:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={depth > 0 ? 'ml-6 sm:ml-10 pl-4 border-l-2 border-purple-100' : ''}
    >
      <div className="py-4">
        {/* Comment header */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-[1.5px] flex-shrink-0">
            <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
              {comment.user.avatar_url ? (
                <Image
                  src={comment.user.avatar_url}
                  alt={comment.user.display_name || comment.user.username}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full rounded-full"
                />
              ) : (
                <span className="text-xs font-bold text-purple-500">
                  {(comment.user.display_name || comment.user.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">
                {comment.user.display_name || comment.user.username}
              </span>
              {comment.user.is_verified && (
                <svg className="w-3.5 h-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
            </div>

            <p className="text-gray-600 text-sm mt-1 leading-relaxed whitespace-pre-wrap break-words">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleLike}
                disabled={!profile}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-pink-500 transition-colors disabled:opacity-50 disabled:cursor-default group"
              >
                <motion.div
                  whileTap={profile ? { scale: 1.3 } : undefined}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  <Heart
                    size={14}
                    className={liked ? 'fill-pink-500 text-pink-500' : 'group-hover:text-pink-500'}
                  />
                </motion.div>
                {likeCount > 0 && (
                  <span className={liked ? 'text-pink-500 font-medium' : ''}>{likeCount}</span>
                )}
              </button>

              {profile && depth === 0 && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 transition-colors"
                >
                  <MessageCircle size={14} />
                  Reply
                </button>
              )}
            </div>

            {/* Reply form */}
            <AnimatePresence>
              {isReplying && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex gap-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      maxLength={500}
                      rows={2}
                      className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-300 resize-none placeholder:text-gray-400"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyContent.trim() || isSubmitting}
                      className="self-end px-3 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {depth === 0 && comment.replies.length > 1 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 ml-11 mb-1 transition-colors"
            >
              {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
          <AnimatePresence>
            {showReplies && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {comment.replies.map((reply) => (
                  <BlogCommentItem
                    key={reply.id}
                    comment={reply}
                    slug={slug}
                    depth={depth + 1}
                    onReplyAdded={onReplyAdded}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

export function BlogComments({ slug }: { blogPostId: string; slug: string }) {
  const { profile, isLoading: authLoading } = useAuth()
  const [comments, setComments] = useState<BlogCommentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/blog/${slug}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('[BlogComments] Failed to fetch comments:', res.status, errData)
      }
    } catch (err) {
      console.error('[BlogComments] Network error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/blog/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (res.ok) {
        setContent('')
        fetchComments()
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('[BlogComments] Failed to post comment:', res.status, errData)
      }
    } catch (err) {
      console.error('[BlogComments] Network error posting comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-14 pt-8 border-t border-gray-100"
    >
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Comments {totalCount > 0 && <span className="text-gray-400 font-normal text-base">({totalCount})</span>}
      </h2>

      {/* Comment input */}
      {authLoading ? (
        <div className="mb-8 p-5 rounded-2xl bg-gray-50 border border-gray-100 flex justify-center">
          <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : profile ? (
        <div className="flex gap-3 mb-8">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-[1.5px] flex-shrink-0">
            <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full rounded-full"
                />
              ) : (
                <span className="text-xs font-bold text-purple-500">
                  {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              maxLength={500}
              rows={3}
              className="w-full text-sm px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-300 resize-none placeholder:text-gray-400"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{content.length}/500</span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                {isSubmitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
          <p className="text-gray-500 text-sm mb-3">Join the conversation</p>
          <Link
            href={`/login?redirect=/blog/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white text-sm font-medium rounded-xl hover:bg-purple-600 transition-colors"
          >
            <LogIn size={15} />
            Log in to comment
          </Link>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {comments.map((comment) => (
            <BlogCommentItem
              key={comment.id}
              comment={comment}
              slug={slug}
              onReplyAdded={fetchComments}
            />
          ))}
        </div>
      )}
    </motion.section>
  )
}
