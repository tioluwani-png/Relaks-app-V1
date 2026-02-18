'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface FollowerUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export default function FollowersPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const { profile: currentUser } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [followers, setFollowers] = useState<FollowerUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loadingFollowId, setLoadingFollowId] = useState<string | null>(null)

  // Load followers list
  useEffect(() => {
    const loadFollowers = async () => {
      setIsLoading(true)
      try {
        const { data: profileUser, error: profileError } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single() as { data: { id: string } | null; error: unknown }

        if (profileError || !profileUser) {
          console.error('Failed to find user:', profileError)
          return
        }

        const { data: followData, error: followError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', profileUser.id) as { data: { follower_id: string }[] | null; error: unknown }

        if (followError) {
          console.error('Failed to load follows:', followError)
          return
        }

        if (followData && followData.length > 0) {
          const followerIds = followData.map(f => f.follower_id)
          const { data: users } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .in('id', followerIds) as { data: FollowerUser[] | null }

          setFollowers(users || [])
        } else {
          setFollowers([])
        }
      } catch (error) {
        console.error('Failed to load followers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFollowers()
  }, [username, supabase])

  // Load current user's follow state
  useEffect(() => {
    if (!currentUser) return

    const loadFollowState = async () => {
      try {
        const { data: myFollowing } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id) as { data: { following_id: string }[] | null }

        if (myFollowing) {
          setFollowingIds(new Set(myFollowing.map(f => f.following_id)))
        }
      } catch (error) {
        console.error('Failed to load follow state:', error)
      }
    }

    loadFollowState()
  }, [currentUser?.id, supabase])

  const handleFollow = useCallback(async (targetUserId: string) => {
    if (!currentUser) return
    setLoadingFollowId(targetUserId)

    const isCurrentlyFollowing = followingIds.has(targetUserId)

    // Optimistic update
    setFollowingIds(prev => {
      const next = new Set(prev)
      if (isCurrentlyFollowing) {
        next.delete(targetUserId)
      } else {
        next.add(targetUserId)
      }
      return next
    })

    try {
      const response = await fetch(`/api/users/${targetUserId}/follow`, {
        method: isCurrentlyFollowing ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        // Revert optimistic update on failure
        setFollowingIds(prev => {
          const next = new Set(prev)
          if (isCurrentlyFollowing) {
            next.add(targetUserId)
          } else {
            next.delete(targetUserId)
          }
          return next
        })
        toast.error('Failed to update follow status')
      }
    } catch {
      // Revert optimistic update on error
      setFollowingIds(prev => {
        const next = new Set(prev)
        if (isCurrentlyFollowing) {
          next.add(targetUserId)
        } else {
          next.delete(targetUserId)
        }
        return next
      })
      toast.error('Failed to update follow status')
    } finally {
      setLoadingFollowId(null)
    }
  }, [currentUser, followingIds])

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="ml-3">
            <h1 className="text-lg font-semibold">Followers</h1>
            <p className="text-xs text-muted-foreground">@{username}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No followers yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {followers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <Link href={`/user/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{user.display_name || user.username}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </Link>

                {currentUser && currentUser.id !== user.id && (
                  <Button
                    variant={followingIds.has(user.id) ? 'outline' : 'default'}
                    size="sm"
                    className="rounded-xl ml-2"
                    onClick={() => handleFollow(user.id)}
                    disabled={loadingFollowId === user.id}
                  >
                    {followingIds.has(user.id) ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
