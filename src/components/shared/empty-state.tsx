'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
  iconColor?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  iconColor = 'text-purple-500',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12 px-4"
    >
      <div className="mx-auto h-16 w-16 rounded-[20px] bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 flex items-center justify-center mb-4">
        <Icon className={`h-8 w-8 ${iconColor}`} strokeWidth={1.75} />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
        {description}
      </p>
      {actionLabel && (actionHref || actionOnClick) && (
        actionHref ? (
          <Link href={actionHref}>
            <Button className="rounded-[20px] bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              {actionLabel}
            </Button>
          </Link>
        ) : (
          <Button
            onClick={actionOnClick}
            className="rounded-[20px] bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
          >
            {actionLabel}
          </Button>
        )
      )}
    </motion.div>
  )
}
