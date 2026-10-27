'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Fades content up as it scrolls into view.
 * The `data-reveal` attribute lets globals.css force it visible under prefers-reduced-motion.
 * Never use this for above-the-fold content: it starts hidden until JS runs.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      data-reveal
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
