import { HERO } from '@/lib/landing/content'
import { CtaButton } from './cta-button'

// Rendered without animation so the headline and buttons paint immediately.
export function Hero() {
  return (
    <section className="relative pt-16 pb-20 md:pt-24 md:pb-32">
      {/* Soft blurred shapes */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-200/25 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute top-32 right-1/4 w-56 h-56 bg-orange-100/30 rounded-full blur-3xl" aria-hidden="true" />

      <div className="container mx-auto px-4 max-w-4xl relative text-center">
        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-purple-100/60">
          <span>{HERO.badge}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
          {HERO.titleLine1}
          <br />
          <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            {HERO.titleLine2}
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          {HERO.subline}
        </p>

        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
            <CtaButton href={HERO.primary.href} event={HERO.primary.event}>
              {HERO.primary.label}
            </CtaButton>
            <CtaButton href={HERO.secondary.href} event={HERO.secondary.event} variant="outline">
              {HERO.secondary.label}
            </CtaButton>
          </div>
          <p className="text-sm text-gray-600">{HERO.note}</p>
        </div>
      </div>
    </section>
  )
}
