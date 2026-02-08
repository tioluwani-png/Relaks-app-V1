'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Search, Loader2, Users, ImageIcon, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  follower_count: number
}

interface SearchPost {
  id: string
  image_url: string
  caption: string | null
  like_count: number
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface SearchPage {
  id: string
  title: string
  description: string | null
  preview_url: string
  category: string | null
  is_free: boolean
  price_naira: number
}

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{
    users: SearchUser[]
    posts: SearchPost[]
    pages: SearchPage[]
  }>({
    users: [],
    posts: [],
    pages: [],
  })

  const debouncedQuery = useDebounce(query, 300)

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults({ users: [], posts: [], pages: [] })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${activeTab}`)
      const data = await response.json()

      if (response.ok) {
        setResults(data)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    search(debouncedQuery)
  }, [debouncedQuery, search])

  const hasResults = results.users.length > 0 || results.posts.length > 0 || results.pages.length > 0

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users, posts, pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start px-4 py-2 h-auto bg-transparent border-b rounded-none">
            <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
            <TabsTrigger value="users" className="text-sm">
              <Users className="h-4 w-4 mr-1" />
              Users
            </TabsTrigger>
            <TabsTrigger value="posts" className="text-sm">
              <ImageIcon className="h-4 w-4 mr-1" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="pages" className="text-sm">
              <Palette className="h-4 w-4 mr-1" />
              Pages
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !query.trim() ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Search for users, posts, or coloring pages
              </p>
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <p className="text-muted-foreground">
                No results found for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <>
              <TabsContent value="all" className="mt-0">
                {/* Users */}
                {results.users.length > 0 && (
                  <section className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Users
                    </h3>
                    <div className="space-y-3">
                      {results.users.slice(0, 3).map((user) => (
                        <UserResult key={user.id} user={user} />
                      ))}
                    </div>
                    {results.users.length > 3 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => setActiveTab('users')}
                      >
                        See all users
                      </Button>
                    )}
                  </section>
                )}

                {/* Posts */}
                {results.posts.length > 0 && (
                  <section className="p-4 border-t">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Posts
                    </h3>
                    <div className="grid grid-cols-3 gap-1">
                      {results.posts.slice(0, 6).map((post) => (
                        <PostResult key={post.id} post={post} />
                      ))}
                    </div>
                    {results.posts.length > 6 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => setActiveTab('posts')}
                      >
                        See all posts
                      </Button>
                    )}
                  </section>
                )}

                {/* Pages */}
                {results.pages.length > 0 && (
                  <section className="p-4 border-t">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Coloring Pages
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {results.pages.slice(0, 4).map((page) => (
                        <PageResult key={page.id} page={page} />
                      ))}
                    </div>
                    {results.pages.length > 4 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={() => setActiveTab('pages')}
                      >
                        See all pages
                      </Button>
                    )}
                  </section>
                )}
              </TabsContent>

              <TabsContent value="users" className="mt-0 p-4">
                <div className="space-y-3">
                  {results.users.map((user) => (
                    <UserResult key={user.id} user={user} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="posts" className="mt-0 p-4">
                <div className="grid grid-cols-3 gap-1">
                  {results.posts.map((post) => (
                    <PostResult key={post.id} post={post} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pages" className="mt-0 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {results.pages.map((page) => (
                    <PageResult key={page.id} page={page} />
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  )
}

function UserResult({ user }: { user: SearchUser }) {
  return (
    <Link
      href={`/user/${user.username}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <Avatar>
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {user.display_name || user.username}
        </p>
        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
      </div>
      <span className="text-xs text-muted-foreground">
        {user.follower_count} followers
      </span>
    </Link>
  )
}

function PostResult({ post }: { post: SearchPost }) {
  return (
    <Link href={`/post/${post.id}`} className="relative aspect-square">
      <Image
        src={post.image_url}
        alt={post.caption || 'Post'}
        fill
        className="object-cover"
      />
    </Link>
  )
}

function PageResult({ page }: { page: SearchPage }) {
  return (
    <Link href={`/discover/pages`} className="bg-card rounded-lg border overflow-hidden">
      <div className="relative aspect-square">
        <Image
          src={page.preview_url}
          alt={page.title}
          fill
          className="object-cover"
        />
        {page.is_free && (
          <Badge className="absolute top-2 right-2 bg-green-500">Free</Badge>
        )}
      </div>
      <div className="p-2">
        <p className="text-sm font-medium truncate">{page.title}</p>
        {!page.is_free && (
          <p className="text-xs text-muted-foreground">N{page.price_naira}</p>
        )}
      </div>
    </Link>
  )
}
