'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { BlogPost, BlogCategory } from '@/types/database'

export default function BlogEditorPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const postId = params?.id as string
  const isEditing = postId !== 'new'

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState<Pick<BlogCategory, 'name' | 'slug'>[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [category, setCategory] = useState('wellness')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

  useEffect(() => {
    loadCategories()
    if (isEditing) {
      loadPost()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategories = async () => {
    const { data } = await supabase
      .from('blog_categories')
      .select('name, slug')
      .order('name')
    setCategories(data || [])
  }

  const loadPost = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single() as { data: BlogPost | null; error: unknown }

      if (error || !data) throw error || new Error('Post not found')

      setTitle(data.title)
      setSlug(data.slug)
      setExcerpt(data.excerpt || '')
      setContent(data.content)
      setCoverImage(data.cover_image_url || '')
      setCategory(data.category)
      setTags(data.tags?.join(', ') || '')
      setStatus(data.status === 'published' ? 'published' : 'draft')
    } catch (error) {
      console.error('Failed to load post:', error)
      alert('Failed to load post')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100)
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!isEditing) {
      setSlug(generateSlug(value))
    }
  }

  const calculateReadTime = (text: string) => {
    const wordsPerMinute = 200
    const wordCount = text.trim().split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `blog/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName)

      setCoverImage(publicUrl)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    }
  }

  const handleSave = async (publishNow = false) => {
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required')
      return
    }

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const finalStatus = publishNow ? 'published' as const : status
      const postData: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        excerpt: excerpt.trim() || content.substring(0, 160),
        content: content.trim(),
        cover_image_url: coverImage || null,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status: finalStatus,
        published_at: finalStatus === 'published' ? new Date().toISOString() : null,
        read_time_minutes: calculateReadTime(content),
        author_id: user?.id || null,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData as never)
          .eq('id', postId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert(postData as never)

        if (error) throw error
      }

      router.push('/admin/blog')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Save error:', error)
      alert('Failed to save: ' + message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Post' : 'New Post'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Cover Image */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cover Image
          </label>
          {coverImage ? (
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image src={coverImage} alt="Cover" fill className="object-cover" />
              <button
                onClick={() => setCoverImage('')}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-purple-400 transition">
              <Upload size={32} className="text-gray-400 mb-2" />
              <span className="text-gray-500 dark:text-gray-400">Click to upload cover image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Title */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter post title..."
            className="w-full px-4 py-3 text-xl font-semibold border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none"
          />
        </div>

        {/* Slug */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              placeholder="post-url-slug"
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none"
            />
          </div>
        </div>

        {/* Excerpt */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Excerpt
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Brief description for previews and SEO..."
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none resize-none"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{excerpt.length}/300 characters</p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content * (HTML supported)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'Write your post content here...\n\nHTML tags like <p>, <h2>, <ul>, <strong> are supported.'}
            rows={20}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none resize-y font-mono text-sm"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ~{calculateReadTime(content)} min read
          </p>
        </div>

        {/* Category & Tags */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:border-purple-400 focus:ring-0 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="wellness, coloring, tips"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
