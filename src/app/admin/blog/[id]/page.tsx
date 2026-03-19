'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Upload, X, Eye, PenLine } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { BlogPost, BlogCategory } from '@/types/database'

export default function BlogEditorPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
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
  const [contentTab, setContentTab] = useState<'write' | 'preview'>('write')

  useEffect(() => {
    loadCategories()
    if (isEditing) {
      loadPost()
    } else {
      // Pre-fill from submission query params if present
      const fromSubmission = searchParams.get('from_submission')
      if (fromSubmission) {
        const subTitle = searchParams.get('title') || ''
        const subCategory = searchParams.get('category') || 'wellness'
        const subContent = searchParams.get('content') || ''
        const authorName = searchParams.get('author_name') || ''

        setTitle(subTitle)
        setSlug(generateSlug(subTitle))
        setContent(subContent)
        setCategory(subCategory)
        if (authorName) {
          setExcerpt(`Submitted by ${authorName}`)
        }
      }
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

  const contentToHtml = (text: string): string => {
    const trimmed = text.trim()
    // If content already has HTML block tags, return as-is
    if (/^<(p|h[1-6]|div|ul|ol|blockquote|section|article|table|figure|hr)[>\s/]/i.test(trimmed)) {
      return trimmed
    }
    // Convert plain text: each line becomes its own paragraph
    return trimmed
      .split(/\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => `<p>${line}</p>`)
      .join('\n')
  }

  const getPreviewHtml = (): string => {
    return contentToHtml(content)
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
      const htmlContent = contentToHtml(content)
      const postData: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        excerpt: excerpt.trim() || content.replace(/<[^>]*>/g, '').substring(0, 160),
        content: htmlContent,
        cover_image_url: coverImage || null,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status: finalStatus,
        published_at: finalStatus === 'published' ? new Date().toISOString() : null,
        read_time_minutes: calculateReadTime(content),
        author_id: user?.id || null,
      }

      let savedPostId = postId

      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData as never)
          .eq('id', postId)

        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase
          .from('blog_posts')
          .insert(postData as never)
          .select('id')
          .single() as { data: { id: string } | null; error: unknown }

        if (error) throw error
        if (inserted) savedPostId = inserted.id
      }

      // Notify all users when publishing
      if (publishNow && savedPostId) {
        fetch('/api/blog/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: savedPostId }),
        }).catch(err => console.error('Notify error:', err))
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
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
          {/* Write / Preview tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setContentTab('write')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                contentTab === 'write'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <PenLine size={16} />
              Write
            </button>
            <button
              onClick={() => setContentTab('preview')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                contentTab === 'preview'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Eye size={16} />
              Preview
            </button>
          </div>

          <div className="p-6">
            {contentTab === 'write' ? (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={'Write your post content here...\n\nJust type naturally with blank lines between paragraphs.\nHTML tags like <h2>, <ul>, <strong> are also supported.'}
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none resize-y font-mono text-sm"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  ~{calculateReadTime(content)} min read &middot; Blank lines create new paragraphs automatically
                </p>
              </>
            ) : (
              <div className="min-h-[300px]">
                {content.trim() ? (
                  <div
                    className="prose prose-lg prose-purple max-w-none
                      prose-headings:text-gray-900 prose-headings:font-bold prose-headings:tracking-tight
                      prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                      prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                      prose-p:text-gray-600 prose-p:leading-[1.8]
                      prose-a:text-purple-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-gray-800
                      prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:bg-gradient-to-r prose-blockquote:from-purple-50 prose-blockquote:to-transparent prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                      prose-img:rounded-2xl prose-img:shadow-lg
                      prose-li:text-gray-600 prose-li:leading-[1.8]
                      prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                    Nothing to preview yet. Switch to Write and add some content.
                  </div>
                )}
              </div>
            )}
          </div>
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
