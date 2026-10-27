import type { ReactNode } from 'react'
import { HERO } from '@/lib/landing/content'
import { CtaButton } from './cta-button'
import { HeroSnow } from './hero-snow'
import { LineArt } from './section'

/**
 * Headline and buttons on the left, the coloring card on the right (stacked on phones).
 * The text is plain server HTML with no animation, so it paints immediately.
 */
export function Hero({
  eyebrow,
  snow = false,
  aside,
}: {
  /** Seasonal eyebrow; the "books in homes" badge shows otherwise */
  eyebrow?: string
  snow?: boolean
  /** The coloring card (or nothing if the page art is missing) */
  aside?: ReactNode
}) {
  return (
    <section id="hero" className="relative overflow-hidden bg-relaks-cream pt-8 pb-10 md:pt-16 md:pb-20">
      <LineArt />
      {snow && <HeroSnow />}

      <div
        className={
          aside
            ? 'container mx-auto px-4 max-w-6xl relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12 lg:items-center'
            : 'container mx-auto px-4 max-w-4xl relative'
        }
      >
        <div className={aside ? 'text-center lg:text-left' : 'text-center'}>
          {eyebrow ? (
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-relaks-coral-ink">{eyebrow}</p>
          ) : (
            <p className="inline-flex items-center bg-white/80 text-relaks-ink px-4 py-2 rounded-full text-sm font-medium mb-6 border border-relaks-coral/40">
              {HERO.badge}
            </p>
          )}

          <h1 className="font-display text-[36px] md:text-[48px] font-bold tracking-tight text-relaks-ink mb-5 leading-[1.1]">
            {HERO.titleLine1}
            <br />
            {HERO.titleLine2Lead}{' '}
            <span className="bg-gradient-to-r from-relaks-purple via-relaks-coral to-relaks-orange bg-clip-text text-transparent">
              {HERO.titleLine2Word}
            </span>
            .
          </h1>

          <p className={`text-base md:text-lg text-gray-700 mb-8 max-w-[52ch] leading-relaxed mx-auto ${aside ? 'lg:mx-0' : ''}`}>
            {HERO.subline}
          </p>

          <div className={`flex flex-col items-center gap-3 ${aside ? 'lg:items-start' : ''}`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
              <CtaButton href={HERO.primary.href} event={HERO.primary.event} variant="gradient">
                {HERO.primary.label}
              </CtaButton>
              <CtaButton href={HERO.secondary.href} event={HERO.secondary.event} variant="outline">
                {HERO.secondary.label}
              </CtaButton>
            </div>
            <p className="text-sm text-gray-700">{HERO.note}</p>
          </div>
        </div>

        {aside}
      </div>
    </section>
  )
}
