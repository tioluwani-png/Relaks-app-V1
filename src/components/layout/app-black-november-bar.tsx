'use client'

import Link from 'next/link'
import { BLACK_NOVEMBER } from '@/lib/landing/content'

function isBlackNovemberClient(): boolean {
  const now = new Date()
  const startsAt = new Date(BLACK_NOVEMBER.startsAt)
  const endsAt = new Date(BLACK_NOVEMBER.endsAt)
  return now >= startsAt && now < endsAt
}

export function AppBlackNovemberBar() {
  if (!isBlackNovemberClient()) return null

  return (
    <div
      className="flex min-h-9 items-center justify-center gap-1 px-4 py-2 text-center text-xs font-medium sm:text-sm"
      style={{ backgroundColor: '#1E1E2C', color: '#F2C14E' }}
    >
      <span className="line-clamp-1">{BLACK_NOVEMBER.barText}</span>
      <Link
        href={BLACK_NOVEMBER.barHref}
        className="shrink-0 underline underline-offset-2 hover:opacity-80"
      >
        {BLACK_NOVEMBER.barLinkLabel}
      </Link>
    </div>
  )
}
