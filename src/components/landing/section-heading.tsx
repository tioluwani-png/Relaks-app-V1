import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

const EYEBROW_COLORS = {
  purple: 'text-purple-700',
  pink: 'text-pink-700',
  orange: 'text-orange-700',
}

export function SectionHeading({
  eyebrow,
  heading,
  color = 'purple',
  className,
}: {
  eyebrow?: string
  heading: string
  color?: keyof typeof EYEBROW_COLORS
  className?: string
}) {
  return (
    <Reveal className={cn('text-center mb-14', className)}>
      {eyebrow && (
        <p className={cn('text-sm font-semibold uppercase tracking-wider mb-3', EYEBROW_COLORS[color])}>
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{heading}</h2>
    </Reveal>
  )
}
