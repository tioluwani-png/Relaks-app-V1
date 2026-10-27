import { ArrowRight } from 'lucide-react'
import { FINAL_CTA } from '@/lib/landing/content'
import { formatCount } from '@/lib/landing/stats'
import { CtaButton } from './cta-button'
import { Reveal } from './reveal'

export function FinalCta({ colorists }: { colorists: number | null }) {
  const joinLine = colorists
    ? FINAL_CTA.joinLine.replace('{colorists}', formatCount(colorists))
    : FINAL_CTA.joinLineFallback

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-400/5" aria-hidden="true" />
      <div className="container mx-auto px-4 max-w-3xl relative">
        <Reveal className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-5">{FINAL_CTA.heading}</h2>
          <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed">{FINAL_CTA.subline}</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <CtaButton href={FINAL_CTA.primary.href} event={FINAL_CTA.primary.event}>
              {FINAL_CTA.primary.label}
              <ArrowRight className="ml-2 h-5 w-5" />
            </CtaButton>
            <CtaButton href={FINAL_CTA.secondary.href} event={FINAL_CTA.secondary.event} variant="outline">
              {FINAL_CTA.secondary.label}
            </CtaButton>
          </div>
          <p className="text-sm text-gray-600 mt-4">{joinLine}</p>
        </Reveal>
      </div>
    </section>
  )
}
