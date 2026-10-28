'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, Bookmark } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { motion, AnimatePresence } from 'framer-motion'
import type { VerificationType, Edition } from '@/types/database'

interface PostComment {
  id: string
  content: string
  user: {
    username: string
  }
}

interface PostCardProps {
  post: {
    id: string
    image_url: string
    caption: string | null
    edition?: Edition | null
    page_number?: number | null
    like_count: number
    comment_count: number
    created_at: string
    is_liked?: boolean
    is_saved?: boolean
    first_comment?: PostComment | null
    user: {
      username: string
      display_name: string | null
      avatar_url: string | null
      is_verified?: boolean
      verification_type?: VerificationType | null
    }
  }
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [isSaved, setIsSaved] = useState(post.is_saved || false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isSaveLoading, setIsSaveLoading] = useState(false)
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const lastTapRef = useRef<number>(0)

  const handleLike = async () => {
    if (isLikeLoading) return
    setIsLikeLoading(true)

    const wasLiked = isLiked
    const prevCount = likeCount

    // Optimistic update
    setIsLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        setIsLiked(wasLiked)
        setLikeCount(prevCount)
      } else {
        const data = await response.json()
        if (typeof data.like_count === 'number') {
          setLikeCount(data.like_count)
        }
      }
    } catch (err) {
      console.error('[PostCard] Like toggle failed:', err)
      setIsLiked(wasLiked)
      setLikeCount(prevCount)
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (!isLiked) {
        handleLike()
      }
      setShowHeartAnimation(true)
      setTimeout(() => setShowHeartAnimation(false), 800)
    }
    lastTapRef.current = now
  }

  const handleSave = async () => {
    if (isSaveLoading) return
    setIsSaveLoading(true)
    setIsSaved(!isSaved)

    try {
      const response = await fetch(`/api/posts/${post.id}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        setIsSaved(isSaved)
      }
    } catch (err) {
      console.error('[PostCard] Save toggle failed:', err)
      setIsSaved(isSaved)
    } finally {
      setIsSaveLoading(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      await navigator.share({
        title: `${post.user.display_name || post.user.username}'s artwork on Relaks`,
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  // Truncate caption to ~2 lines (roughly 100 chars)
  const truncatedCaption = post.caption && post.caption.length > 100 && !captionExpanded
    ? post.caption.slice(0, 100).trim() + '...'
    : post.caption

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Link href={`/user/${post.user.username}`}>
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={post.user.avatar_url || undefined} />
            <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700">
              {post.user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link
              href={`/user/${post.user.username}`}
              className="font-semibold hover:underline truncate text-sm"
            >
              {post.user.display_name || post.user.username}
            </Link>
            <VerificationBadge
              isVerified={post.user.is_verified || false}
              verificationType={post.user.verification_type}
              size="sm"
            />
          </div>
          {/* Edition and page link */}
          {post.edition && post.page_number && (
            <Link
              href={`/references/${post.edition}/${post.page_number}`}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
            >
              {post.edition} · Page {post.page_number}
            </Link>
          )}
          {!post.edition && (
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>

      {/* Image with double-tap to like */}
      <div
        className="relative aspect-[4/5] bg-muted mx-3 rounded-xl overflow-hidden cursor-pointer"
        onClick={handleDoubleTap}
      >
        <Image
          src={post.image_url}
          alt={post.caption || 'Colored artwork'}
          fill
          className="object-cover"
        />

        {/* Heart animation overlay */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="h-20 w-20 text-white fill-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        {/* Action row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 p-2 -ml-2 rounded-xl hover:bg-muted transition-colors min-w-[44px] min-h-[44px]"
            >
              <Heart
                className={cn(
                  'h-6 w-6 transition-colors',
                  isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'
                )}
              />
              {likeCount > 0 && (
                <span className="text-sm font-medium">{likeCount}</span>
              )}
            </button>
            <Link
              href={`/post/${post.id}#comments`}
              className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors min-w-[44px] min-h-[44px]"
            >
              <MessageCircle className="h-6 w-6" />
              {post.comment_count > 0 && (
                <span className="text-sm font-medium">{post.comment_count}</span>
              )}
            </Link>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl hover:bg-muted transition-colors min-w-[44px] min-h-[44px]"
            >
              <Share2 className="h-6 w-6" />
            </button>
          </div>
          <button
            onClick={handleSave}
            className={cn(
              'p-2 rounded-xl hover:bg-muted transition-colors min-w-[44px] min-h-[44px]',
              isSaved && 'text-purple-500'
            )}
          >
            <Bookmark className={cn('h-6 w-6', isSaved && 'fill-current')} />
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <Link
              href={`/user/${post.user.username}`}
              className="font-semibold hover:underline mr-1.5"
            >
              {post.user.username}
            </Link>
            {truncatedCaption}
            {post.caption.length > 100 && !captionExpanded && (
              <button
                onClick={() => setCaptionExpanded(true)}
                className="text-muted-foreground ml-1"
              >
                more
              </button>
            )}
          </p>
        )}

        {/* First comment */}
        {post.first_comment && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground mr-1.5">
              {post.first_comment.user.username}
            </span>
            {post.first_comment.content.length > 60
              ? post.first_comment.content.slice(0, 60) + '...'
              : post.first_comment.content}
          </p>
        )}

        {/* View all comments */}
        {post.comment_count > (post.first_comment ? 1 : 0) && (
          <Link
            href={`/post/${post.id}#comments`}
            className="text-sm text-muted-foreground hover:underline block"
          >
            View all {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
          </Link>
        )}

        {/* Timestamp (if edition shown, put timestamp here) */}
        {post.edition && (
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        )}
      </div>
    </motion.article>
  )
}
