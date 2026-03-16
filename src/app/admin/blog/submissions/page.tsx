'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle2, XCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react'

interface Submission {
  id: string
  title: string
  category: string
  content: string
  display_name: string
  is_anonymous: boolean
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

type TabStatus = 'pending' | 'approved' | 'rejected'

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabStatus>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/blog/submissions')
      const data = await res.json()
      if (res.ok) {
        setSubmissions(data.submissions)
      }
    } catch (error) {
      console.error('Failed to load submissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (submission: Submission) => {
    setActionLoading(submission.id)
    try {
      const res = await fetch(`/api/blog/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })

      if (res.ok) {
        setSubmissions(prev =>
          prev.map(s => s.id === submission.id ? { ...s, status: 'approved' as const } : s)
        )

        // Redirect to blog editor with submission content pre-filled via query params
        const params = new URLSearchParams({
          from_submission: submission.id,
          title: submission.title,
          category: submission.category,
          content: submission.content,
          author_name: submission.is_anonymous ? 'Anonymous' : submission.display_name,
        })
        window.open(`/admin/blog/new?${params.toString()}`, '_blank')
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert('Failed to approve submission')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/blog/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', admin_notes: rejectNote || null }),
      })

      if (res.ok) {
        setSubmissions(prev =>
          prev.map(s => s.id === id ? { ...s, status: 'rejected' as const, admin_notes: rejectNote || null } : s)
        )
        setRejectingId(null)
        setRejectNote('')
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('Failed to reject submission')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredSubmissions = submissions.filter(s => s.status === activeTab)

  const tabs: { status: TabStatus; label: string; icon: React.ReactNode }[] = [
    { status: 'pending', label: 'Pending', icon: <Clock size={16} /> },
    { status: 'approved', label: 'Approved', icon: <CheckCircle2 size={16} /> },
    { status: 'rejected', label: 'Rejected', icon: <XCircle size={16} /> },
  ]

  const getCount = (status: TabStatus) => submissions.filter(s => s.status === status).length

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      rant: 'bg-red-100 text-red-700',
      story: 'bg-blue-100 text-blue-700',
      inspiration: 'bg-yellow-100 text-yellow-700',
      tips: 'bg-green-100 text-green-700',
      'personal-journey': 'bg-purple-100 text-purple-700',
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/blog" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Blog Submissions</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const count = getCount(tab.status)
          return (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.status
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.status
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-500 dark:text-gray-400">
            No {activeTab} submissions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg truncate">
                      {submission.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${getCategoryBadge(submission.category)}`}>
                        {submission.category.replace('-', ' ')}
                      </span>
                      <span>
                        by {submission.is_anonymous ? (
                          <span className="italic">Anonymous</span>
                        ) : (
                          submission.display_name
                        )}
                        {' '}(@{submission.user.username})
                      </span>
                      <span>{format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition"
                      title="View full content"
                    >
                      {expandedId === submission.id ? <ChevronUp size={18} /> : <Eye size={18} />}
                    </button>

                    {submission.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(submission)}
                          disabled={actionLoading === submission.id}
                          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === submission.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setRejectingId(rejectingId === submission.id ? null : submission.id)}
                          disabled={actionLoading === submission.id}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content preview (when not expanded) */}
                {expandedId !== submission.id && (
                  <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                    {submission.content}
                  </p>
                )}

                {/* Admin notes */}
                {submission.admin_notes && (
                  <div className="mt-3 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Admin note:</span> {submission.admin_notes}
                  </div>
                )}
              </div>

              {/* Expanded content */}
              {expandedId === submission.id && (
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
                  <div className="mt-4 prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {submission.content}
                  </div>
                </div>
              )}

              {/* Reject form */}
              {rejectingId === submission.id && (
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason for rejection (optional)..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:border-red-400 focus:ring-0 focus:outline-none resize-none text-sm"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setRejectingId(null)
                          setRejectNote('')
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(submission.id)}
                        disabled={actionLoading === submission.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50"
                      >
                        {actionLoading === submission.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
