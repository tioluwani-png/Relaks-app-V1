import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TrackedLink } from './tracked-link'

const VARIANTS = {
  gradient:
    'text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/50 hover:shadow-xl hover:scale-[1.03]',
  outline:
    'text-gray-800 bg-white/70 border-2 border-gray-300 hover:border-purple-300 hover:bg-white',
}

export function CtaButton({
  href,
  event,
  variant = 'gradient',
  className,
  children,
}: {
  href: string
  event: string
  variant?: keyof typeof VARIANTS
  className?: string
  children: ReactNode
}) {
  return (
    <TrackedLink
      href={href}
      event={event}
      className={cn(
        'inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </TrackedLink>
  )
}
