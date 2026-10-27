'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState, type ReactNode } from 'react'
import type { HeroColoringProps } from './hero-coloring'

// Loaded after the page: the headline and buttons never wait for it
const HeroColoring = dynamic(() => import('./hero-coloring'), { ssr: false })

/** Shows the server-rendered placeholder controls until the island has attached to the SVG. */
export function HeroColoringLoader({
  placeholder,
  ...props
}: Omit<HeroColoringProps, 'onReady'> & { placeholder: ReactNode }) {
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])

  return (
    <>
      {!ready && placeholder}
      <HeroColoring {...props} onReady={onReady} />
    </>
  )
}
