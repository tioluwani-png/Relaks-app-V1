import { APP_ROWS, APP_SECTION } from '@/lib/landing/content'
import type { LandingImages } from '@/lib/landing/images'
import { PRICING } from '@/lib/paystack'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/landing/stats'
import { CtaButton } from './cta-button'
import { PhoneFrame } from './landing-image'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

/** `editions` is the naturally joined list of active edition names */
export function AppSection({ editions, images }: { editions: string; images: LandingImages }) {
  const fill = (line: string) =>
    line.replace('{editions}', editions).replace('{aiPrice}', formatCount(PRICING.aiStarter))

  return (
    <section id="app" className="py-16 md:py-24 scroll-mt-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeading eyebrow={APP_SECTION.eyebrow} heading={APP_SECTION.heading} className="mb-12 md:mb-16" />

        <div className="space-y-16 md:space-y-24">
          {APP_ROWS.map((row, i) => {
            const image = images[row.image]
            const flipped = i % 2 === 1
            return (
              <Reveal key={row.heading}>
                <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
                  <div className={cn('text-center md:text-left', flipped && 'md:order-2')}>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{row.heading}</h3>
                    {row.lines.map((line) => (
                      <p key={line} className="text-lg text-gray-700 leading-relaxed">{fill(line)}</p>
                    ))}
                  </div>
                  <div className={cn(flipped && 'md:order-1')}>
                    <PhoneFrame
                      src={image.src}
                      alt={image.alt}
                      label={image.kind === 'phone' ? image.label : row.heading}
                      className="max-w-[220px] md:max-w-[250px]"
                    />
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <CtaButton href={APP_SECTION.cta.href} event={APP_SECTION.cta.event}>
            {APP_SECTION.cta.label}
          </CtaButton>
        </div>
      </div>
    </section>
  )
}
