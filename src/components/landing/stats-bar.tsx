import { RATING_SOURCE, STATS } from '@/lib/landing/content'
import { formatCount, type LandingStats } from '@/lib/landing/stats'
import { cn } from '@/lib/utils'
import type { Tone } from './section'

export function StatsBar({ stats, tone }: { stats: LandingStats | null; tone: Tone }) {
  const items: { value: string; label: string; source?: string }[] = [
    { value: STATS.booksSold, label: STATS.booksSoldLabel },
    ...(stats
      ? [
          { value: `${formatCount(stats.colorists)}+`, label: STATS.coloristsLabel },
          { value: `${formatCount(stats.pages)}+`, label: STATS.pagesLabel },
        ]
      : []),
    { value: STATS.rating, label: STATS.ratingLabel, source: RATING_SOURCE || undefined },
  ]

  return (
    <section
      aria-label="Relaks in numbers"
      className={cn('py-8 md:py-10 border-y border-relaks-ink/10', tone === 'tint' ? 'bg-relaks-tint' : 'bg-relaks-cream')}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {items.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-relaks-ink">{stat.value}</div>
              <div className="text-sm text-gray-700 mt-1">{stat.label}</div>
              {stat.source && <p className="text-xs text-gray-700 mt-1">{stat.source}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
