'use client'

import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { Settings, Grid3X3, Bookmark, Download, Sparkles, AlertCircle, Heart, Pencil } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/shared/motion'

interface UserPost {
  id: string
  image_url: string
  thumbnail_url: string | null
  like_count: number
  comment_count: number
}

interface SavedPost {
  id: string
  image_url: string
  thumbnail_url: string | null
  like_count: number
}

const profileTabs = [
  { value: 'posts', icon: Grid3X3, label: 'Posts' },
  { value: 'saved', icon: Bookmark, label: 'Saved' },
  { value: 'downloads', icon: Download, label: 'Downloads' },
  { value: 'creations', icon: Sparkles, label: 'Creations' },
]

export function ProfileContent() {
  const { user, profile, isLoading, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState<UserPost[]>([])
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isLoadingSaved, setIsLoadingSaved] = useState(false)

  useEffect(() => {
    if (!profile) return

    const fetchPosts = async () => {
      setIsLoadingPosts(true)
      try {
        const response = await fetch(`/api/users/${profile.id}`)
        const data = await response.json()
        if (response.ok && data.user?.posts) {
          setPosts(data.user.posts)
        }
      } catch {
        console.error('Failed to fetch posts')
      } finally {
        setIsLoadingPosts(false)
      }
    }

    fetchPosts()
  }, [profile])

  useEffect(() => {
    if (!profile || activeTab !== 'saved') return

    const fetchSaved = async () => {
      setIsLoadingSaved(true)
      try {
        const response = await fetch(`/api/users/${profile.id}/saved`)
        const data = await response.json()
        if (response.ok) {
          setSavedPosts(data.posts || [])
        }
      } catch {
        console.error('Failed to fetch saved posts')
      } finally {
        setIsLoadingSaved(false)
      }
    }

    fetchSaved()
  }, [profile, activeTab])

  if (isLoading) {
    return (
      <div className="space-y-0">
        <div className="h-28 gradient-purple-pink opacity-60" />
        <div className="px-4 -mt-10 space-y-4">
          <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          <div className="flex justify-around py-4">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 w-16" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4 text-center py-16">
        <div className="h-16 w-16 mx-auto rounded-2xl gradient-purple-pink flex items-center justify-center mb-4">
          <span className="text-2xl text-white font-bold">?</span>
        </div>
        <p className="text-muted-foreground mb-4">Please log in to view your profile</p>
        <Link href="/login">
          <Button className="rounded-xl gradient-purple-pink text-white border-0">Log in</Button>
        </Link>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-4 space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile not found</AlertTitle>
          <AlertDescription>
            Your profile could not be loaded. This might be a temporary issue.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => refreshProfile()} className="rounded-xl">
            Try Again
          </Button>
          <Link href="/onboarding">
            <Button variant="outline" className="rounded-xl">Complete Setup</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Gradient Header */}
      <div className="h-28 gradient-purple-pink relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
      </div>

      <FadeIn className="px-4 -mt-10 space-y-5">
        {/* Profile Info */}
        <div className="flex items-end gap-4">
          <div className="p-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
            <Avatar className="h-20 w-20 border-4 border-background">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl font-bold">
                {(profile.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {profile.display_name || profile.username}
              </h2>
              <VerificationBadge
                isVerified={profile.is_verified}
                verificationType={profile.verification_type}
                size="lg"
              />
            </div>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          </div>
          <div className="flex gap-1.5">
            <Link href="/profile/edit">
              <Button variant="outline" size="icon" className="rounded-xl">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/profile/settings">
              <Button variant="outline" size="icon" className="rounded-xl">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex justify-around text-center py-4 bg-muted/50 rounded-2xl">
          <div>
            <div className="text-lg font-bold">{posts.length}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <Link href={`/user/${profile.username}/followers`} className="hover:opacity-80">
            <div className="text-lg font-bold">{profile.follower_count}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </Link>
          <Link href={`/user/${profile.username}/following`} className="hover:opacity-80">
            <div className="text-lg font-bold">{profile.following_count}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </Link>
          <div>
            <div className="text-lg font-bold">{profile.journal_streak}</div>
            <div className="text-xs text-muted-foreground">Streak</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {profileTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium relative transition-colors',
                  isActive ? 'text-purple-500' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {isActive && (
                  <motion.div
                    layoutId="profile-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-purple-pink"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'posts' && (
            isLoadingPosts ? (
              <div className="grid grid-cols-3 gap-0.5">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-none" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={Grid3X3}
                title="No posts yet"
                description="Share your first colored artwork"
                actionLabel="Upload"
                actionHref="/create/upload"
              />
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="relative aspect-square bg-muted group"
                  >
                    <Image
                      src={post.thumbnail_url || post.image_url}
                      alt="Post"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-1 text-white text-sm font-semibold">
                        <Heart className="h-4 w-4 fill-current" />
                        {post.like_count}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
          {activeTab === 'saved' && (
            isLoadingSaved ? (
              <div className="grid grid-cols-3 gap-0.5">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-none" />
                ))}
              </div>
            ) : savedPosts.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved posts"
                description="Save posts to view them here"
              />
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {savedPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="relative aspect-square bg-muted"
                  >
                    <Image
                      src={post.thumbnail_url || post.image_url}
                      alt="Saved post"
                      fill
                      className="object-cover"
                    />
                  </Link>
                ))}
              </div>
            )
          )}
          {activeTab === 'downloads' && (
            <EmptyState
              icon={Download}
              title="No downloads"
              description="Download coloring pages to view them here"
              actionLabel="Browse Pages"
              actionHref="/discover/pages"
            />
          )}
          {activeTab === 'creations' && (
            <EmptyState
              icon={Sparkles}
              title="No AI creations"
              description="Generate custom coloring pages with AI"
              actionLabel="Generate"
              actionHref="/create/generate"
            />
          )}
        </div>
      </FadeIn>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="text-center py-12">
      <div className="h-14 w-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button variant="outline" size="sm" className="rounded-xl">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  )
}
