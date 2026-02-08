'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Trophy, Heart, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

interface RankedPost {
  id: string
  image_url: string
  thumbnail_url: string | null
  like_count: number
  rank: number
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface RankedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_likes_received: number
  journal_streak: number
  rank: number
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [posts, setPosts] = useState<RankedPost[]>([])
  const [users, setUsers] = useState<RankedUser[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoadingPosts(true)
      try {
        const response = await fetch(`/api/leaderboard/posts?period=${period}`)
        const data = await response.json()
        if (response.ok) {
          setPosts(data.posts)
        }
      } catch {
        console.error('Failed to fetch posts')
      } finally {
        setIsLoadingPosts(false)
      }
    }

    fetchPosts()
  }, [period])

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true)
      try {
        const response = await fetch('/api/leaderboard/users')
        const data = await response.json()
        if (response.ok) {
          setUsers(data.users)
        }
      } catch {
        console.error('Failed to fetch users')
      } finally {
        setIsLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-yellow-500">🥇</span>
      case 2:
        return <span className="text-gray-400">🥈</span>
      case 3:
        return <span className="text-amber-600">🥉</span>
      default:
        return <span className="text-muted-foreground font-mono">{rank}</span>
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <Tabs defaultValue="posts">
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1">Top Posts</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">Top Colorists</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4 space-y-4">
            {/* Period Filter */}
            <div className="flex gap-2">
              {(['week', 'month', 'all'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
                </Button>
              ))}
            </div>

            {isLoadingPosts ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No posts yet for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 text-center text-lg">
                      {getRankBadge(post.rank)}
                    </div>
                    <div className="h-14 w-14 relative rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={post.thumbnail_url || post.image_url}
                        alt="Post"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {post.user.display_name || post.user.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{post.user.username}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-red-500">
                      <Heart className="h-4 w-4 fill-current" />
                      <span className="font-semibold">{post.like_count}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-3">
            {isLoadingUsers ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No users yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/user/${user.username}`}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 text-center text-lg">
                      {getRankBadge(user.rank)}
                    </div>
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-red-500">
                        <Heart className="h-4 w-4 fill-current" />
                        <span className="font-semibold">{user.total_likes_received}</span>
                      </div>
                      {user.journal_streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-500 text-sm">
                          <Flame className="h-3 w-3" />
                          <span>{user.journal_streak}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
