'use client'

import { useState } from 'react'
import { ChevronUp, Clock, CheckCircle, XCircle, BookOpen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import type { BookRequestWithUser } from '@/types/database'

interface BookRequestCardProps {
  request: BookRequestWithUser
  onVote: (requestId: string) => Promise<void>
  onUnvote: (requestId: string) => Promise<void>
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  fulfilled: {
    icon: BookOpen,
    label: 'Fulfilled',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
}

export function BookRequestCard({ request, onVote, onUnvote }: BookRequestCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const status = statusConfig[request.status]
  const StatusIcon = status.icon

  const handleVoteToggle = async () => {
    if (isVoting || request.status !== 'pending') return
    setIsVoting(true)

    try {
      if (request.has_voted) {
        await onUnvote(request.id)
      } else {
        await onVote(request.id)
      }
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm"
    >
      {/* Vote Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleVoteToggle}
        disabled={isVoting || request.status !== 'pending'}
        className={cn(
          'flex flex-col items-center justify-center min-w-[60px] py-2 rounded-xl transition-colors',
          request.has_voted
            ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-600'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700',
          (isVoting || request.status !== 'pending') && 'opacity-50 cursor-not-allowed'
        )}
      >
        <ChevronUp
          className={cn(
            'h-5 w-5 transition-transform',
            request.has_voted && 'text-purple-500'
          )}
        />
        <span className="text-lg font-bold">{request.vote_count}</span>
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {request.book_title}
            </h3>
            {request.author && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                by {request.author}
              </p>
            )}
          </div>
          <Badge className={cn('shrink-0', status.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>

        {request.reason && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {request.reason}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
          {request.user && (
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={request.user.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {request.user.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{request.user.display_name || request.user.username}</span>
            </div>
          )}
          <span>
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </span>
        </div>

        {request.admin_notes && request.status !== 'pending' && (
          <div className="mt-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Admin note: </span>
            <span className="text-gray-600 dark:text-gray-400">{request.admin_notes}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
