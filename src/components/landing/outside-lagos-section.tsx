import { MapPin } from 'lucide-react'
import { OUTSIDE_LAGOS_SECTION } from '@/lib/landing/content'
import type { LandingDistributor } from '@/lib/landing/data'
import { getDistributorWhatsAppMessage, getWhatsAppLink } from '@/lib/shop/config'
import { Section, SectionHeading, type Tone } from './section'
import { WhatsAppIcon } from './social-icons'
import { TrackedLink } from './tracked-link'

/** Active distributors with the same prefilled WhatsApp message as /shop. Hidden when there are none. */
export function OutsideLagosSection({ distributors, tone }: { distributors: LandingDistributor[]; tone: Tone }) {
  if (distributors.length === 0) return null

  return (
    <Section id="outside-lagos" tone={tone}>
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeading eyebrow={OUTSIDE_LAGOS_SECTION.eyebrow} heading={OUTSIDE_LAGOS_SECTION.heading} />
        <ul className="grid gap-2 md:grid-cols-4 md:gap-4">
          {distributors.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-relaks-ink/10 bg-white p-3 md:flex-col md:items-stretch md:p-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-bold text-relaks-ink">
                  <MapPin className="h-4 w-4 shrink-0 text-relaks-coral" aria-hidden="true" />
                  {d.city}
                </p>
                <p className="text-sm text-gray-700 md:mb-3">{d.name}</p>
              </div>
              <TrackedLink
                href={getWhatsAppLink(d.whatsapp_number, getDistributorWhatsAppMessage(d.name, d.city))}
                event="outside_lagos_whatsapp"
                aria-label={`Message ${d.name} in ${d.city} on WhatsApp`}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-relaks-ink/20 px-4 text-sm font-semibold text-relaks-ink hover:border-relaks-ink/50 md:mt-auto"
              >
                <WhatsAppIcon className="h-4 w-4 text-green-700" />
                <span>
                  <span className="md:hidden">WhatsApp</span>
                  <span className="hidden md:inline">{OUTSIDE_LAGOS_SECTION.button}</span>
                </span>
              </TrackedLink>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
