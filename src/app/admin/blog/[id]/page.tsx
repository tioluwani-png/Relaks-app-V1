'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Save, Upload, X,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link2, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import UnderlineExtension from '@tiptap/extension-underline'
import type { BlogPost, BlogCategory } from '@/types/database'

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        isActive
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
}

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
  const [coverImage, setCoverImage] = useState('')
  const [category, setCategory] = useState('wellness')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [initialContent, setInitialContent] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-purple-600 underline' },
      }),
      ImageExtension,
      Placeholder.configure({
        placeholder: 'Start writing your post...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      UnderlineExtension,
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg prose-purple max-w-none min-h-[400px] px-4 py-3 focus:outline-none ' +
          'prose-headings:text-gray-900 prose-headings:font-bold prose-headings:tracking-tight ' +
          'prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 ' +
          'prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 ' +
          'prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 ' +
          'prose-p:text-gray-600 prose-p:leading-[1.8] ' +
          'prose-a:text-purple-600 prose-a:font-medium ' +
          'prose-strong:text-gray-800 ' +
          'prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:bg-purple-50/50 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:not-italic ' +
          'prose-li:text-gray-600 prose-li:leading-[1.8] ' +
          'prose-img:rounded-2xl prose-img:shadow-lg',
      },
    },
  })

  // Update editor content when initialContent is loaded
  useEffect(() => {
    if (editor && initialContent !== null) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  useEffect(() => {
    loadCategories()
    if (isEditing) {
      loadPost()
    } else {
      const fromSubmission = searchParams.get('from_submission')
      if (fromSubmission) {
        const subTitle = searchParams.get('title') || ''
        const subCategory = searchParams.get('category') || 'wellness'
        const subContent = searchParams.get('content') || ''
        const authorName = searchParams.get('author_name') || ''

        setTitle(subTitle)
        setSlug(generateSlug(subTitle))
        setCategory(subCategory)
        if (authorName) setExcerpt(`Submitted by ${authorName}`)
        // Convert plain text submission to paragraphs for editor
        const htmlContent = subContent
          .split(/\n/)
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((line: string) => `<p>${line}</p>`)
          .join('')
        setInitialContent(htmlContent)
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
      setCoverImage(data.cover_image_url || '')
      setCategory(data.category)
      setTags(data.tags?.join(', ') || '')
      setStatus(data.status === 'published' ? 'published' : 'draft')
      setInitialContent(data.content)
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
    const plainText = text.replace(/<[^>]*>/g, '').trim()
    const wordCount = plainText.split(/\s+/).length
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

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Enter image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const handleSave = async (publishNow = false) => {
    if (!editor) return
    const htmlContent = editor.getHTML()
    const plainText = editor.getText()

    if (!title.trim() || !plainText.trim()) {
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
        excerpt: excerpt.trim() || plainText.substring(0, 160),
        content: htmlContent,
        cover_image_url: coverImage || null,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status: finalStatus,
        published_at: finalStatus === 'published' ? new Date().toISOString() : null,
        read_time_minutes: calculateReadTime(htmlContent),
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

        {/* Content - Rich Text Editor */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 px-6 pt-5 pb-2">
            Content *
          </label>

          {/* Toolbar */}
          {editor && (
            <div className="flex flex-wrap items-center gap-0.5 px-4 py-2 border-y border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
              >
                <Heading1 size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                <Heading2 size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                <Heading3 size={16} />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
              >
                <Bold size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
              >
                <Italic size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline"
              >
                <UnderlineIcon size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
              >
                <Strikethrough size={16} />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
              >
                <List size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
              >
                <ListOrdered size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Quote"
              >
                <Quote size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Divider"
              >
                <Minus size={16} />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
              >
                <AlignLeft size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
              >
                <AlignCenter size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
              >
                <AlignRight size={16} />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Add Link">
                <Link2 size={16} />
              </ToolbarButton>

              <div className="flex-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
              >
                <Undo2 size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
              >
                <Redo2 size={16} />
              </ToolbarButton>
            </div>
          )}

          {/* Editor Area */}
          <div className="px-2 py-2">
            <EditorContent editor={editor} />
          </div>

          <div className="px-6 pb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ~{calculateReadTime(editor?.getHTML() || '')} min read
            </p>
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
