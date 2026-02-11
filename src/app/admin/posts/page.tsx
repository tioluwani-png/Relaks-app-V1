'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Flag, Eye, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AdminPost {
  id: string
  image_url: string
  caption: string | null
  is_public: boolean
  is_flagged: boolean
  created_at: string
  user: {
    id: string
    username: string
    email: string
  }
}

export default function AdminPostsPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFlagged, setFilterFlagged] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [filterFlagged]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          image_url,
          caption,
          is_public,
          is_flagged,
          created_at,
          user:users!posts_user_id_fkey(id, username, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filterFlagged) {
        query = query.eq('is_flagged', true)
      }

      const { data, error } = await query

      if (error) throw error
      setPosts((data as unknown as AdminPost[]) || [])
    } catch (error) {
      console.error('Failed to load posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      setPosts(posts.filter(p => p.id !== postId))
      toast.success('Post deleted')
    } catch (error) {
      console.error('Failed to delete post:', error)
      toast.error('Failed to delete post')
    }
  }

  const handleFlagPost = async (postId: string, flagged: boolean) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          is_flagged: flagged,
          flagged_at: flagged ? new Date().toISOString() : null,
        } as never)
        .eq('id', postId)

      if (error) throw error

      setPosts(posts.map(p =>
        p.id === postId ? { ...p, is_flagged: flagged } : p
      ))
      toast.success(flagged ? 'Post flagged' : 'Post unflagged')
    } catch (error) {
      console.error('Failed to flag post:', error)
      toast.error('Failed to update post')
    }
  }

  const filteredPosts = posts.filter(post => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      post.user?.username?.toLowerCase().includes(search) ||
      post.user?.email?.toLowerCase().includes(search) ||
      post.caption?.toLowerCase().includes(search)
    )
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Post Moderation</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username, email, or caption..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-purple-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setFilterFlagged(!filterFlagged)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              filterFlagged
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Flag size={18} />
            Flagged Only
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading posts...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No posts found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden ${
                post.is_flagged ? 'ring-2 ring-red-500' : ''
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square">
                <Image
                  src={post.image_url}
                  alt="Post"
                  fill
                  className="object-cover"
                />
                {post.is_flagged && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Flagged
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{post.user?.username}</p>
                    <p className="text-xs text-gray-500">{post.user?.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    post.is_public ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {post.is_public ? 'Public' : 'Private'}
                  </span>
                </div>

                {post.caption && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{post.caption}</p>
                )}

                <p className="text-xs text-gray-400 mb-3">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/post/${post.id}`}
                    target="_blank"
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition"
                  >
                    <Eye size={16} />
                    View
                  </Link>
                  <button
                    onClick={() => handleFlagPost(post.id, !post.is_flagged)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition ${
                      post.is_flagged
                        ? 'bg-green-100 hover:bg-green-200 text-green-700'
                        : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                    }`}
                  >
                    <Flag size={16} />
                    {post.is_flagged ? 'Unflag' : 'Flag'}
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="flex items-center justify-center gap-1 py-2 px-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
