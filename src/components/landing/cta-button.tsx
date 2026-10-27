import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TrackedLink } from './tracked-link'

// The gradient is reserved for the hero and final CTA primary buttons
const VARIANTS = {
  gradient:
    'text-white bg-gradient-to-r from-relaks-purple via-relaks-coral to-relaks-orange shadow-lg shadow-relaks-coral/25 hover:shadow-xl',
  ink: 'text-white bg-relaks-ink hover:bg-black',
  outline: 'text-relaks-ink bg-white/80 border-2 border-relaks-ink/25 hover:border-relaks-ink/60 hover:bg-white',
}

export function CtaButton({
  href,
  event,
  variant = 'ink',
  size = 'lg',
  className,
  children,
}: {
  href: string
  event: string
  variant?: keyof typeof VARIANTS
  size?: 'md' | 'lg'
  className?: string
  children: ReactNode
}) {
  return (
    <TrackedLink
      href={href}
      event={event}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300',
        size === 'lg' ? 'min-h-14 px-8 text-lg' : 'min-h-12 px-6 text-base',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </TrackedLink>
  )
}
