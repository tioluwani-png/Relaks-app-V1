'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface FollowingUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export default function FollowingPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const { profile: currentUser } = useAuth()
  const supabase = createClient()

  const [following, setFollowing] = useState<FollowingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loadingFollowId, setLoadingFollowId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [username]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      // Get the user ID from username
      const { data: profileUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single() as { data: { id: string } | null }

      if (!profileUser) return

      // Get who this user follows
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profileUser.id) as { data: { following_id: string }[] | null }

      if (followData && followData.length > 0) {
        const followedIds = followData.map(f => f.following_id)
        const { data: users } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', followedIds) as { data: FollowingUser[] | null }

        setFollowing(users || [])
      }

      // Get who current user follows (for follow/unfollow buttons)
      if (currentUser) {
        const { data: myFollowing } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id) as { data: { following_id: string }[] | null }

        if (myFollowing) {
          setFollowingIds(new Set(myFollowing.map(f => f.following_id)))
        }
      }
    } catch (error) {
      console.error('Failed to load following:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser) return
    setLoadingFollowId(targetUserId)

    const isFollowing = followingIds.has(targetUserId)

    try {
      const response = await fetch(`/api/users/${targetUserId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      })

      if (response.ok) {
        setFollowingIds(prev => {
          const next = new Set(prev)
          if (isFollowing) {
            next.delete(targetUserId)
          } else {
            next.add(targetUserId)
          }
          return next
        })
      } else {
        toast.error('Failed to update follow status')
      }
    } catch {
      toast.error('Failed to update follow status')
    } finally {
      setLoadingFollowId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="ml-3">
            <h1 className="text-lg font-semibold">Following</h1>
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
        ) : following.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Not following anyone yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {following.map((user) => (
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
