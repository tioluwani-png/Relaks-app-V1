import { Printer } from 'lucide-react'
import { HERO_COLORING, type Swatch } from '@/lib/landing/content'
import { cn } from '@/lib/utils'
import { HeroColoringLoader } from './hero-coloring-loader'
import { SwatchRow } from './swatch-row'
import { TrackedLink } from './tracked-link'

const CARD_ID = 'hero-coloring'
const MESSAGES_ID = 'hero-coloring-messages'

/**
 * Server-rendered coloring card: the page SVG is inlined so it paints with the HTML,
 * and the interactive island attaches to it after load.
 */
export function HeroColoringCard({
  svg,
  season,
  ariaLabel,
  caption,
  palette,
  completeHeading,
  shopHref,
  shopLabel,
}: {
  svg: string
  season: 'christmas' | 'default'
  ariaLabel: string
  caption: string
  palette: Swatch[]
  completeHeading: string
  shopHref: string
  shopLabel: string
}) {
  return (
    <div data-pencils-avoid className="w-full max-w-[520px] lg:max-w-[420px] mx-auto">
      <div
        id={CARD_ID}
        role="group"
        aria-label={ariaLabel}
        className={cn(
          'hero-coloring-paper rounded-3xl border p-3 shadow-xl shadow-relaks-ink/10 sm:p-4',
          season === 'christmas'
            ? 'border-[#C8102E]/30 ring-1 ring-inset ring-[#1B7A43]/20'
            : 'border-relaks-coral/30'
        )}
      >
        {/* Fixed aspect box so nothing moves while the SVG and controls load */}
        <div className="aspect-[633/930] w-full overflow-hidden rounded-2xl bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
        <p id={`${CARD_ID}-help`} className="mt-2 text-center text-sm text-gray-700">
          {caption}
          <span className="sr-only">. Use the arrow keys to move between areas and Enter to fill.</span>
        </p>
        <div className="mt-1">
          <HeroColoringLoader
            cardId={CARD_ID}
            messagesId={MESSAGES_ID}
            palette={palette}
            completeHeading={completeHeading}
            shopHref={shopHref}
            shopLabel={shopLabel}
            saveFileName={season === 'christmas' ? HERO_COLORING.save.christmasFileName : HERO_COLORING.save.defaultFileName}
            placeholder={<SwatchRow palette={palette} disabled />}
          />
        </div>
      </div>
      {/* Blank A4 PDF, generated once at build time (src/app/landing/<file>/route.ts) */}
      <p className="mt-2 text-center">
        <TrackedLink
          href={HERO_COLORING.print[season].href}
          event={HERO_COLORING.print.event}
          download
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-relaks-coral-ink underline underline-offset-2"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          {HERO_COLORING.print.label}
        </TrackedLink>
      </p>
      <div id={MESSAGES_ID} className="mt-1" />
    </div>
  )
}
