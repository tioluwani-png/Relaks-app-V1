'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Share2, Bookmark } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { AnimatedHeart } from '@/components/shared/motion'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { motion } from 'framer-motion'
import type { VerificationType } from '@/types/database'

interface PostCardProps {
  post: {
    id: string
    image_url: string
    caption: string | null
    like_count: number
    comment_count: number
    created_at: string
    is_liked?: boolean
    is_saved?: boolean
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

  const handleLike = async () => {
    if (isLikeLoading) return
    setIsLikeLoading(true)

    // Optimistic update
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        // Revert on error
        setIsLiked(isLiked)
        setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
      }
    } catch {
      // Revert on error
      setIsLiked(isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleSave = async () => {
    if (isSaveLoading) return
    setIsSaveLoading(true)

    // Optimistic update
    setIsSaved(!isSaved)

    try {
      const response = await fetch(`/api/posts/${post.id}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        // Revert on error
        setIsSaved(isSaved)
      }
    } catch {
      // Revert on error
      setIsSaved(isSaved)
    } finally {
      setIsSaveLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${post.user.display_name || post.user.username}'s artwork on Relaks`,
        url: `${window.location.origin}/post/${post.id}`,
      })
    } else {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
      // TODO: Show toast
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Link href={`/user/${post.user.username}`}>
          <div className="p-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
            <Avatar className="h-9 w-9 border-2 border-background">
              <AvatarImage src={post.user.avatar_url || undefined} />
              <AvatarFallback className="text-xs font-semibold">
                {post.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
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
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Image */}
      <Link href={`/post/${post.id}`}>
        <div className="relative aspect-square bg-muted mx-3 rounded-xl overflow-hidden">
          <Image
            src={post.image_url}
            alt={post.caption || 'Colored artwork'}
            fill
            className="object-cover"
          />
        </div>
      </Link>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <AnimatedHeart isLiked={isLiked} />
            </button>
            <Link href={`/post/${post.id}#comments`}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className={cn('rounded-xl', isSaved && 'text-purple-500')}
          >
            <Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />
          </Button>
        </div>

        {/* Like count */}
        <p className="text-sm font-semibold">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </p>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <Link
              href={`/user/${post.user.username}`}
              className="font-semibold hover:underline mr-2"
            >
              {post.user.username}
            </Link>
            {post.caption}
          </p>
        )}

        {/* Comments link */}
        {post.comment_count > 0 && (
          <Link
            href={`/post/${post.id}#comments`}
            className="text-sm text-muted-foreground hover:underline"
          >
            View all {post.comment_count} comments
          </Link>
        )}
      </div>
    </motion.article>
  )
}
