'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Share2, Bookmark, ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { usePost } from '@/hooks/use-posts'
import { useAuth } from '@/hooks/use-auth'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { toast } from 'sonner'
import type { CommentWithUser } from '@/types/database'

interface PostDetailProps {
  postId: string
}

export function PostDetail({ postId }: PostDetailProps) {
  const router = useRouter()
  const { post, isLoading, error, likePost } = usePost(postId)
  const { profile } = useAuth()
  const [isSaved, setIsSaved] = useState(false)
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (post) {
      setIsSaved(post.is_saved || false)
      fetchComments()
    }
  }, [post]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      const data = await response.json()
      if (response.ok) {
        setComments(data.comments)
      }
    } catch {
      console.error('Failed to fetch comments')
    }
  }

  const handleSave = async () => {
    setIsSaved(!isSaved)
    // TODO: Implement save API
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Artwork on Relaks`,
        url: window.location.href,
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })

      const data = await response.json()
      if (response.ok) {
        setComments(prev => [...prev, { ...data.comment, replies: [] }])
        setNewComment('')
        toast.success('Comment added')
      } else {
        toast.error(data.error || 'Failed to add comment')
      }
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Post deleted')
        router.push('/feed')
      } else {
        toast.error('Failed to delete post')
      }
    } catch {
      toast.error('Failed to delete post')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background border-b">
          <div className="flex items-center h-14 px-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-4 w-24 ml-4" />
          </div>
        </header>
        <Skeleton className="aspect-square w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{error || 'Post not found'}</p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    )
  }

  const isOwner = profile?.id === post.user_id

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Post</span>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!isOwner && <div className="w-10" />}
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* User Info */}
        <div className="flex items-center gap-3 p-4">
          <Link href={`/user/${post.user.username}`}>
            <Avatar>
              <AvatarImage src={post.user.avatar_url || undefined} />
              <AvatarFallback>
                {post.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="flex items-center gap-1">
              <Link
                href={`/user/${post.user.username}`}
                className="font-semibold hover:underline"
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
        <div className="relative aspect-square bg-muted">
          <Image
            src={post.image_url}
            alt={post.caption || 'Colored artwork'}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={likePost}
                className={cn(post.is_liked && 'text-red-500')}
              >
                <Heart className={cn('h-6 w-6', post.is_liked && 'fill-current')} />
              </Button>
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-6 w-6" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className={cn(isSaved && 'text-primary')}
            >
              <Bookmark className={cn('h-6 w-6', isSaved && 'fill-current')} />
            </Button>
          </div>

          <p className="font-semibold">
            {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
          </p>

          {post.caption && (
            <p>
              <Link
                href={`/user/${post.user.username}`}
                className="font-semibold hover:underline mr-2"
              >
                {post.user.username}
              </Link>
              {post.caption}
            </p>
          )}

          {post.edition && (
            <p className="text-sm text-muted-foreground">
              {post.edition.charAt(0).toUpperCase() + post.edition.slice(1)} Edition
              {post.page_number && ` • Page ${post.page_number}`}
            </p>
          )}
        </div>

        {/* Comments Section */}
        <div className="border-t p-4 space-y-4" id="comments">
          <h3 className="font-semibold">Comments ({comments.length})</h3>

          {/* Comment Form */}
          {profile ? (
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[40px] resize-none"
                  rows={1}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim() || isSubmitting}
                >
                  Post
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href={`/login?redirect=/post/${postId}`} className="text-primary hover:underline">
                Log in
              </Link>{' '}
              to add a comment
            </p>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function CommentItem({ comment }: { comment: CommentWithUser }) {
  return (
    <div className="flex gap-3">
      <Link href={`/user/${comment.user.username}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user.avatar_url || undefined} />
          <AvatarFallback>
            {comment.user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1">
        <p className="text-sm">
          <Link
            href={`/user/${comment.user.username}`}
            className="font-semibold hover:underline mr-1"
          >
            {comment.user.username}
          </Link>
          <VerificationBadge
            isVerified={comment.user.is_verified || false}
            verificationType={comment.user.verification_type}
            size="sm"
            className="inline-flex align-middle mr-1"
          />
          {comment.content}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </p>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
