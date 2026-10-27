import { ArrowRight } from 'lucide-react'
import { FINAL_CTA, PENCILS } from '@/lib/landing/content'
import { formatCount } from '@/lib/landing/stats'
import { cn } from '@/lib/utils'
import { CtaButton } from './cta-button'
import { FloatingPencilsLoader } from './floating-pencils-loader'
import { H2_CLASS, Section, type Tone } from './section'

export function FinalCta({ colorists, tone, pencilPalette }: { colorists: number | null; tone: Tone; pencilPalette: string[] }) {
  const joinLine = colorists
    ? FINAL_CTA.joinLine.replace('{colorists}', formatCount(colorists))
    : FINAL_CTA.joinLineFallback

  return (
    // Taller bands on phones leave room for the pencils above and below the text
    <Section id="final-cta" tone={tone} className="overflow-hidden pt-20 pb-20 md:py-24">
      <FloatingPencilsLoader containerId="final-cta" count={PENCILS.finalCta} palette={pencilPalette} />
      <div className="container mx-auto px-4 max-w-3xl relative text-center">
        <h2 data-pencils-avoid className={cn(H2_CLASS, 'mx-auto max-w-[22ch] mb-4')}>{FINAL_CTA.heading}</h2>
        <p data-pencils-avoid className="text-gray-700 mb-8 max-w-[52ch] mx-auto leading-relaxed">{FINAL_CTA.subline}</p>
        <div data-pencils-avoid className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <CtaButton href={FINAL_CTA.primary.href} event={FINAL_CTA.primary.event} variant="gradient">
            {FINAL_CTA.primary.label}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </CtaButton>
          <CtaButton href={FINAL_CTA.secondary.href} event={FINAL_CTA.secondary.event} variant="outline">
            {FINAL_CTA.secondary.label}
          </CtaButton>
        </div>
        <p data-pencils-avoid className="text-sm text-gray-700 mt-4 mx-auto w-fit">{joinLine}</p>
      </div>
    </Section>
  )
}
