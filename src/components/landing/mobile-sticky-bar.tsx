'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { STICKY_BAR } from '@/lib/landing/content'
import { TrackedLink } from './tracked-link'

const DISMISS_KEY = 'relaks_landing_sticky_dismissed'

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Phone-only CTA bar that appears once the element with `heroId` has scrolled out of view. */
export function MobileStickyBar({ heroId = 'hero' }: { heroId?: string }) {
  const [pastHero, setPastHero] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const hero = document.getElementById(heroId)
    if (!hero) return
    const observer = new IntersectionObserver(([entry]) => {
      // Only once the hero is above the viewport, not before it.
      // The bar starts off-screen, so reading sessionStorage here is early enough.
      if (readDismissed()) setDismissed(true)
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [heroId])

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage unavailable (private browsing) - hide for this page view only
    }
  }

  if (dismissed) return null

  return (
    <>
      {/* Keeps the footer reachable above the bar */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-[#FFFBF5]/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 md:hidden ${
          pastHero ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!pastHero}
        inert={!pastHero}
      >
        <div className="flex items-center gap-2">
          <TrackedLink
            href={STICKY_BAR.primary.href}
            event={STICKY_BAR.primary.event}
            className="flex-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 py-2.5 text-center text-sm font-semibold text-white shadow-md"
          >
            {STICKY_BAR.primary.label}
          </TrackedLink>
          <TrackedLink
            href={STICKY_BAR.secondary.href}
            event={STICKY_BAR.secondary.event}
            className="flex-1 rounded-full border-2 border-gray-300 bg-white py-2 text-center text-sm font-semibold text-gray-800"
          >
            {STICKY_BAR.secondary.label}
          </TrackedLink>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide this bar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  )
}
