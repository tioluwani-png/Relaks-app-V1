'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X, BookPlus, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import type { BookRequest, BookRequestStatus } from '@/types/database'

type RequestWithUser = BookRequest & {
  user: { id: string; username: string; display_name: string | null } | null
}

export default function AdminBookRequestsPage() {
  const supabase = createClient()
  const [requests, setRequests] = useState<RequestWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BookRequestStatus | 'all'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<RequestWithUser | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadRequests = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('book_requests')
        .select(`
          *,
          user:users!book_requests_user_id_fkey(id, username, display_name)
        `)
        .order('vote_count', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Failed to load requests:', error)
      toast.error('Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: BookRequestStatus) => {
    setIsUpdating(true)

    try {
      const { error } = await supabase
        .from('book_requests')
        .update({
          status,
          admin_notes: adminNotes || null,
        } as never)
        .eq('id', id)

      if (error) throw error

      toast.success(`Request ${status}`)
      setSelectedRequest(null)
      setAdminNotes('')
      loadRequests()
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error('Failed to update request')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: BookRequestStatus) => {
    const styles: Record<BookRequestStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      fulfilled: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Requests</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Review and manage community book requests
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as BookRequestStatus | 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookPlus className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="flex items-start gap-4 p-4">
                {/* Vote Count */}
                <div className="flex flex-col items-center justify-center min-w-[60px] py-2 bg-purple-50 dark:bg-purple-950/30 rounded-xl text-purple-600">
                  <ChevronUp className="h-5 w-5" />
                  <span className="text-lg font-bold">{request.vote_count}</span>
                  <span className="text-xs">votes</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {request.book_title}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.author && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {request.author}
                    </p>
                  )}
                  {request.reason && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {request.reason}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    {request.user && (
                      <span>
                        Requested by {request.user.display_name || request.user.username}
                      </span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {request.admin_notes && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                      <span className="font-medium">Admin notes:</span> {request.admin_notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => {
                        setSelectedRequest(request)
                        setAdminNotes('')
                      }}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleUpdateStatus(request.id, 'rejected')}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p>
              Approving request for: <strong>{selectedRequest?.book_title}</strong>
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Admin Notes (optional)
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedRequest(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => selectedRequest && handleUpdateStatus(selectedRequest.id, 'approved')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Approving...
                  </>
                ) : (
                  'Approve Request'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
