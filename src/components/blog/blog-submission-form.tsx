'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, CheckCircle2, LogIn, PenLine } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'rant', label: 'Rant' },
  { value: 'story', label: 'Story' },
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'tips', label: 'Tips' },
  { value: 'personal-journey', label: 'Personal Journey' },
]

const MAX_CONTENT_LENGTH = 5000

export function BlogSubmissionForm() {
  const supabase = createClient()
  const [user, setUser] = useState<{ id: string; display_name?: string | null } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('rant')
  const [displayName, setDisplayName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [content, setContent] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('id, display_name')
          .eq('id', authUser.id)
          .single() as { data: { id: string; display_name: string | null } | null; error: unknown }

        if (profile) {
          setUser(profile)
          setDisplayName(profile.display_name || '')
        }
      }
      setIsLoading(false)
    }
    loadUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/blog/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          content: content.trim(),
          display_name: displayName.trim(),
          is_anonymous: isAnonymous,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-3xl py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
          <PenLine size={16} />
          Community Stories
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Submit Your Story
        </h1>
        <p className="text-gray-600 text-lg max-w-xl mx-auto">
          Got a rant, a story, or something inspiring to share? We&apos;d love to hear it.
          Submissions are reviewed before publishing.
        </p>
      </div>

      {/* Auth gate */}
      {!user ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn size={28} className="text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Log in to submit</h2>
          <p className="text-gray-500 mb-6">You need to be logged in to submit a story.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/40 hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Log in
          </Link>
        </div>
      ) : isSuccess ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Story submitted!</h2>
          <p className="text-gray-500 mb-6">
            Your story has been submitted for review. We&apos;ll publish it once it&apos;s approved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setIsSuccess(false)
                setTitle('')
                setContent('')
                setCategory('rant')
                setIsAnonymous(false)
              }}
              className="px-5 py-2.5 text-purple-600 font-medium border border-purple-200 rounded-full hover:bg-purple-50 transition"
            >
              Submit Another
            </button>
            <Link
              href="/blog"
              className="px-5 py-2.5 text-white font-semibold rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:shadow-lg transition-all duration-300"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your story a title..."
              maxLength={200}
              required
              className="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Category & Name */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:border-purple-400 focus:ring-0 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you want to be credited"
                  maxLength={100}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Anonymous toggle */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isAnonymous}
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  isAnonymous ? 'bg-purple-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                    isAnonymous ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">
                Post anonymously {isAnonymous && <span className="text-purple-600 font-medium">(your name will be hidden)</span>}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Story <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
              placeholder="Write your story here... Let it all out."
              rows={12}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-transparent focus:border-purple-400 focus:ring-0 focus:outline-none resize-y placeholder:text-gray-400 leading-relaxed"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-400">
                Blank lines create paragraphs
              </p>
              <p className={`text-sm ${content.length > MAX_CONTENT_LENGTH * 0.9 ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim() || !displayName.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-white font-semibold text-lg rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/40 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={20} />
                Submit Story
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
