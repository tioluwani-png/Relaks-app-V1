import { RATING_SOURCE, STATS } from '@/lib/landing/content'
import { formatCount, type LandingStats } from '@/lib/landing/stats'
import { Reveal } from './reveal'

export function StatsBar({ stats }: { stats: LandingStats | null }) {
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
    <section className="py-10 bg-white/60 border-y border-gray-100/60">
      <div className="container mx-auto px-4 max-w-5xl">
        <Reveal>
          <div className="grid grid-cols-2 md:flex md:flex-wrap md:justify-center gap-8 md:gap-16">
            {items.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                {stat.source && <p className="text-xs text-gray-600 mt-1">{stat.source}</p>}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
