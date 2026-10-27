'use client'

import dynamic from 'next/dynamic'
import type { FloatingPencilsProps } from './floating-pencils'

// Loaded after the page so it never delays the hero text, buttons or coloring card.
// Until then the section shows its plain cream background.
const FloatingPencils = dynamic(() => import('./floating-pencils'), { ssr: false })

export function FloatingPencilsLoader(props: FloatingPencilsProps) {
  return <FloatingPencils {...props} />
}
