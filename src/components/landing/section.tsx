import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Neighbouring sections alternate between these backgrounds (assigned in app/page.tsx). */
export type Tone = 'cream' | 'tint'

/**
 * Door colours: books = coral, Reading Club = purple, app = orange.
 * Bright shades are for icons, borders and fills; `text` uses the darker shade for contrast.
 */
export const ACCENTS = {
  coral: {
    text: 'text-relaks-coral-ink',
    icon: 'text-relaks-coral',
    bar: 'bg-relaks-coral',
    soft: 'bg-relaks-coral/10',
    border: 'border-relaks-coral/40',
  },
  purple: {
    text: 'text-relaks-purple-ink',
    icon: 'text-relaks-purple',
    bar: 'bg-relaks-purple',
    soft: 'bg-relaks-purple/10',
    border: 'border-relaks-purple/40',
  },
  orange: {
    text: 'text-relaks-orange-ink',
    icon: 'text-relaks-orange',
    bar: 'bg-relaks-orange',
    soft: 'bg-relaks-orange/10',
    border: 'border-relaks-orange/40',
  },
} as const

export type Accent = keyof typeof ACCENTS

export function Section({
  id,
  tone,
  className,
  children,
}: {
  id?: string
  tone: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cn(
        'relative scroll-mt-20 py-10 md:py-24',
        tone === 'tint' ? 'bg-relaks-tint' : 'bg-relaks-cream',
        className
      )}
    >
      {children}
    </section>
  )
}

/** H2 in the display face at 26/32px. */
export const H2_CLASS = 'font-display text-[26px] md:text-[32px] font-semibold leading-tight text-relaks-ink'

export function SectionHeading({
  eyebrow,
  heading,
  accent = 'coral',
  align = 'center',
  className,
}: {
  eyebrow?: string
  heading: string
  accent?: Accent
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <div className={cn('mb-6 md:mb-12', align === 'center' ? 'text-center' : 'text-left', className)}>
      {eyebrow && (
        <p className={cn('text-sm font-semibold uppercase tracking-wider mb-2', ACCENTS[accent].text)}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn(H2_CLASS, align === 'center' && 'mx-auto max-w-[24ch]')}>{heading}</h2>
    </div>
  )
}

/** Coral floral and mandala outlines at ~8% opacity, behind the hero and final CTA. */
export function LineArt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 bg-[url('/landing/line-art.svg')] bg-cover bg-center opacity-[0.08]",
        className
      )}
    />
  )
}
