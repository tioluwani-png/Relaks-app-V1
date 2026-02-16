'use client'

import { useSyncExternalStore } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface RelativeTimeProps {
  date: string | Date
  className?: string
}

const emptySubscribe = () => () => {}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  // Show placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return <span className={className}>...</span>
  }

  return (
    <span className={className}>
      {formatDistanceToNow(new Date(date), { addSuffix: true })}
    </span>
  )
}
