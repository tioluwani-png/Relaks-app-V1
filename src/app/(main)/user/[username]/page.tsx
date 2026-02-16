'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Grid3X3 } from 'lucide-react'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { UserProfile, Post } from '@/types/database'

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const username = params.username as string
  const { profile: currentUser } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/users/${username}`)
        const data = await response.json()

        if (response.ok) {
          setUser(data.user)
          setPosts(data.user.posts || [])
          setIsFollowing(data.user.is_following || false)
        } else {
          toast.error(data.error || 'User not found')
        }
      } catch {
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [username])

  const handleFollow = async () => {
    if (!currentUser || !user) return

    setIsFollowLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        setUser(prev => prev ? {
          ...prev,
          follower_count: isFollowing ? prev.follower_count - 1 : prev.follower_count + 1,
        } : null)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update follow status')
      }
    } catch {
      toast.error('Failed to update follow status')
    } finally {
      setIsFollowLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b">
          <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-6 w-32 ml-4" />
          </div>
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === user.id

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">{user.username}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {user.display_name || user.username}
              </h2>
              <VerificationBadge
                isVerified={user.is_verified}
                verificationType={user.verification_type}
                size="lg"
              />
            </div>
            <p className="text-muted-foreground">@{user.username}</p>
            {user.bio && (
              <p className="text-sm mt-2">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Action Button */}
        {!isOwnProfile && currentUser && (
          <Button
            className="w-full"
            variant={isFollowing ? 'outline' : 'default'}
            onClick={handleFollow}
            disabled={isFollowLoading}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        )}

        {isOwnProfile && (
          <Link href="/profile/edit">
            <Button variant="outline" className="w-full">
              Edit Profile
            </Button>
          </Link>
        )}

        {/* Stats */}
        <div className="flex justify-around text-center border-y py-4">
          <div>
            <div className="font-bold">{posts.length}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div>
            <div className="font-bold">{user.follower_count}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div>
            <div className="font-bold">{user.following_count}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </div>
        </div>

        {/* Posts Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="h-4 w-4" />
            <span className="font-semibold">Posts</span>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="relative aspect-square bg-muted"
                >
                  <Image
                    src={post.thumbnail_url || post.image_url}
                    alt={post.caption || 'Post'}
                    fill
                    className="object-cover"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
