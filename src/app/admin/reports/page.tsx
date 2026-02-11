'use client'

import { useEffect, useState } from 'react'
import { Flag, CheckCircle, XCircle, Eye, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ReportWithDetails {
  id: string
  reason: string
  details: string | null
  status: string
  created_at: string
  reviewed_at: string | null
  reporter: { username: string } | null
  reported_user: { id: string; username: string } | null
  reported_post: { id: string; caption: string | null; image_url: string } | null
}

type FilterStatus = 'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export default function AdminReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<ReportWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')

  useEffect(() => {
    loadReports()
  }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadReports = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('reports')
        .select(`
          id,
          reason,
          details,
          status,
          created_at,
          reviewed_at,
          reporter:users!reports_reporter_id_fkey(username),
          reported_user:users!reports_reported_user_id_fkey(id, username),
          reported_post:posts!reports_reported_post_id_fkey(id, caption, image_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setReports((data as unknown as ReportWithDetails[]) || [])
    } catch (error) {
      console.error('Failed to load reports:', error)
      toast.error('Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        } as never)
        .eq('id', reportId)

      if (error) throw error

      setReports(reports.map(r =>
        r.id === reportId ? { ...r, status: newStatus, reviewed_at: new Date().toISOString() } : r
      ))
      toast.success(`Report marked as ${newStatus}`)
    } catch (error) {
      console.error('Failed to update report:', error)
      toast.error('Failed to update report')
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Reports</h1>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-2 shadow-sm mb-6 flex gap-1 overflow-x-auto">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilterStatus(option.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filterStatus === option.value
                ? 'bg-purple-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 shadow-sm text-center">
          <Flag className="mx-auto mb-3 text-gray-300" size={48} />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No reports</h3>
          <p className="text-sm text-gray-500">
            {filterStatus === 'pending' ? 'No pending reports to review' : 'No reports found'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[report.status] || statusColors.pending}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {report.reason.replace(/_/g, ' ')}
                  </p>
                  {report.details && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{report.details}</p>
                  )}
                </div>
              </div>

              {/* Report Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Reported by</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {report.reporter?.username || 'Unknown'}
                  </p>
                </div>
                {report.reported_user && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Reported user</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {report.reported_user.username}
                    </p>
                  </div>
                )}
                {report.reported_post && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Reported post</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {report.reported_post.caption || 'No caption'}
                    </p>
                  </div>
                )}
                {report.reviewed_at && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Reviewed</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(report.reviewed_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {report.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition"
                  >
                    <Eye size={16} />
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(report.id, 'resolved')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition"
                  >
                    <CheckCircle size={16} />
                    Resolve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition"
                  >
                    <XCircle size={16} />
                    Dismiss
                  </button>
                </div>
              )}
              {report.status === 'reviewed' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(report.id, 'resolved')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition"
                  >
                    <CheckCircle size={16} />
                    Resolve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition"
                  >
                    <XCircle size={16} />
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
