import type { ReactNode } from 'react'
import { Brush, NotebookPen, Palette, Sparkles, type LucideIcon } from 'lucide-react'
import { APP_ROWS, APP_SECTION, type AppRowImage } from '@/lib/landing/content'
import type { LandingImages } from '@/lib/landing/images'
import { PRICING } from '@/lib/paystack'
import { cn } from '@/lib/utils'
import { formatCount } from '@/lib/landing/stats'
import { CtaButton } from './cta-button'
import { PhoneFrame } from './landing-image'
import { Reveal } from './reveal'
import { ACCENTS, Section, SectionHeading, type Tone } from './section'
import { SwipeRow } from './swipe-row'

const ROW_ICONS: Record<AppRowImage, LucideIcon> = {
  appCanvas: Brush,
  appReferences: Palette,
  appFeed: Sparkles,
  appJournal: NotebookPen,
}

/**
 * Desktop: four rows alternating image left/right.
 * Phones: the same rows as a swipe row, which keeps the page a sensible length.
 */
export function AppSection({
  editions,
  images,
  screens = {},
  tone,
}: {
  editions: string
  images: LandingImages
  /** Built screens from real content; a screenshot in public/landing/ still takes priority */
  screens?: Partial<Record<AppRowImage, ReactNode>>
  tone: Tone
}) {
  const fill = (line: string) =>
    line.replace('{editions}', editions).replace('{aiPrice}', formatCount(PRICING.aiStarter))
  const accent = ACCENTS.orange

  const rows = APP_ROWS.map((row) => {
    const image = images[row.image]
    const Icon = ROW_ICONS[row.image]
    const text = (
      <>
        <div className="mb-3 flex flex-col items-center gap-1.5 md:flex-row md:flex-wrap md:items-center md:gap-2">
          <Icon className={cn('h-5 w-5 shrink-0', accent.icon)} aria-hidden="true" />
          <h3 className="text-lg md:text-xl font-bold leading-snug text-relaks-ink">{row.heading}</h3>
          {row.comingSoon && (
            <span
              className={cn(
                'whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                accent.border,
                accent.text
              )}
            >
              {APP_SECTION.comingSoon}
            </span>
          )}
        </div>
        {row.lines.map((line) => (
          <p key={line} className="text-gray-700 leading-relaxed max-w-[46ch] mx-auto md:mx-0">{fill(line)}</p>
        ))}
      </>
    )
    const phone = (className: string) => (
      <PhoneFrame
        src={image.src}
        alt={image.alt}
        label={image.kind === 'phone' ? image.label : row.heading}
        sizes="(min-width: 768px) 240px, 180px"
        className={className}
      >
        {image.src ? undefined : screens[row.image]}
      </PhoneFrame>
    )
    return { row, text, phone }
  })

  return (
    <Section id="app" tone={tone}>
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeading eyebrow={APP_SECTION.eyebrow} heading={APP_SECTION.heading} accent="orange" />

        {/* Phones */}
        <div className="md:hidden">
          <SwipeRow label="What you can do in the app" dots itemClassName="w-[78%]">
            {rows.map(({ row, text, phone }) => (
              <div key={row.heading} className="h-full rounded-2xl border border-relaks-ink/10 bg-white p-4 text-center">
                {phone('max-w-[130px] mb-4')}
                {text}
              </div>
            ))}
          </SwipeRow>
        </div>

        {/* Tablet and desktop */}
        <div className="hidden md:block space-y-14">
          {rows.map(({ row, text, phone }, i) => {
            const flipped = i % 2 === 1
            return (
              <Reveal key={row.heading}>
                <div className="grid grid-cols-2 items-center gap-16">
                  <div className={cn(flipped && 'order-2')}>{text}</div>
                  <div className={cn(flipped && 'order-1')}>{phone('max-w-[200px] lg:max-w-[220px]')}</div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <div className="mt-6 md:mt-16 text-center">
          <CtaButton href={APP_SECTION.cta.href} event={APP_SECTION.cta.event}>
            {APP_SECTION.cta.label}
          </CtaButton>
        </div>
      </div>
    </Section>
  )
}
