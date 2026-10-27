import { HERO } from '@/lib/landing/content'
import type { LandingImage } from '@/lib/landing/images'
import { CtaButton } from './cta-button'
import { LandingImageView } from './landing-image'
import { LineArt } from './section'

// Rendered without animation so the headline and buttons paint immediately.
export function Hero({ image }: { image: LandingImage | null }) {
  return (
    <section id="hero" className="relative overflow-hidden bg-relaks-cream pt-8 pb-10 md:pt-20 md:pb-24">
      <LineArt />

      <div
        className={
          image
            ? 'container mx-auto px-4 max-w-6xl relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center'
            : 'container mx-auto px-4 max-w-4xl relative'
        }
      >
        <div className={image ? 'text-center lg:text-left' : 'text-center'}>
          <p className="inline-flex items-center bg-white/80 text-relaks-ink px-4 py-2 rounded-full text-sm font-medium mb-6 border border-relaks-coral/40">
            {HERO.badge}
          </p>

          <h1 className="font-display text-[36px] md:text-[48px] font-bold tracking-tight text-relaks-ink mb-5 leading-[1.1]">
            {HERO.titleLine1}
            <br />
            {HERO.titleLine2Lead}{' '}
            <span className="bg-gradient-to-r from-relaks-purple via-relaks-coral to-relaks-orange bg-clip-text text-transparent">
              {HERO.titleLine2Word}
            </span>
            .
          </h1>

          <p className={`text-base md:text-lg text-gray-700 mb-8 max-w-[52ch] leading-relaxed mx-auto ${image ? 'lg:mx-0' : ''}`}>
            {HERO.subline}
          </p>

          <div className={`flex flex-col items-center gap-3 ${image ? 'lg:items-start' : ''}`}>
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

        {image && (
          <LandingImageView
            image={image}
            preload
            sizes="(min-width: 1024px) 460px, (min-width: 640px) 320px, 220px"
            photoClassName="mx-auto w-full max-w-[220px] sm:max-w-xs lg:max-w-none aspect-[4/5] rounded-3xl shadow-xl shadow-relaks-ink/10 border-4 border-white"
          />
        )}
      </div>
    </section>
  )
}
