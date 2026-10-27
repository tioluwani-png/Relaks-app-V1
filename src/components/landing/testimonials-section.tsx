import Image from 'next/image'
import { TESTIMONIALS, TESTIMONIALS_SECTION } from '@/lib/landing/content'
import { Section, SectionHeading, type Tone } from './section'
import { SwipeRow } from './swipe-row'

export function TestimonialsSection({ tone }: { tone: Tone }) {
  return (
    <Section tone={tone}>
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={TESTIMONIALS_SECTION.eyebrow} heading={TESTIMONIALS_SECTION.heading} accent="purple" />

        <SwipeRow
          label="What our community says"
          dots
          itemClassName="w-[85%] sm:w-[60%] md:w-auto"
          desktopGridClassName="md:grid-cols-3 md:gap-6"
        >
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex h-full flex-col overflow-hidden rounded-2xl border border-relaks-ink/10 bg-white">
              {t.image && (
                <div className="relative aspect-[4/3] bg-relaks-tint">
                  <Image
                    src={t.image}
                    alt={`Page colored by ${t.name}`}
                    fill
                    sizes="(min-width: 768px) 360px, 85vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5 md:p-6">
                <blockquote className="flex-1 text-relaks-ink leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-relaks-purple/15 text-sm font-bold text-relaks-purple-ink"
                    aria-hidden="true"
                  >
                    {t.name.charAt(0)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-relaks-ink">{t.name}</span>
                    <span className="block text-sm text-gray-700">{t.location}</span>
                  </span>
                </figcaption>
              </div>
            </figure>
          ))}
        </SwipeRow>
      </div>
    </Section>
  )
}
