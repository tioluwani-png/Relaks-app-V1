'use client'

import Link from 'next/link'
import { track } from '@vercel/analytics'
import type { ComponentProps } from 'react'

/** Fires a Vercel Analytics event on click, with the ?from= URL parameter attached when present. */
export function trackLandingEvent(event: string) {
  let from: string | null = null
  try {
    from = new URLSearchParams(window.location.search).get('from')
  } catch {
    // Ignore - location unavailable
  }
  track(event, from ? { from } : undefined)
}

type TrackedLinkProps = ComponentProps<typeof Link> & { event: string }

export function TrackedLink({ event, onClick, href, ...props }: TrackedLinkProps) {
  const handleClick: TrackedLinkProps['onClick'] = (e) => {
    trackLandingEvent(event)
    onClick?.(e)
  }

  // mailto: and external links don't go through the Next router
  if (typeof href === 'string' && /^(mailto:|https?:)/.test(href)) {
    const external = href.startsWith('http')
    return (
      <a
        href={href}
        onClick={handleClick}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...(props as ComponentProps<'a'>)}
      />
    )
  }

  return <Link href={href} onClick={handleClick} {...props} />
}
