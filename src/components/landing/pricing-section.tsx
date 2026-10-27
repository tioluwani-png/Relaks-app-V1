import { PRICING_SECTION } from '@/lib/landing/content'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'
import { TrackedLink } from './tracked-link'

function CheckList({ items, tone }: { items: string[]; tone: 'emerald' | 'purple' }) {
  const dot = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-100 text-purple-700'
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
          <span className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${dot}`} aria-hidden="true">
            &#10003;
          </span>
          {item}
        </li>
      ))}
    </ul>
  )
}

export function PricingSection() {
  const { free, credits } = PRICING_SECTION

  return (
    <section id="pricing" className="py-20 md:py-28 bg-white/40 scroll-mt-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <SectionHeading eyebrow={PRICING_SECTION.eyebrow} heading={PRICING_SECTION.heading} />

        <Reveal delay={0.1}>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{free.title}</h3>
              <p className="text-sm text-gray-600 mb-6">{free.subtitle}</p>
              <CheckList items={free.items} tone="emerald" />
              <TrackedLink
                href={free.cta.href}
                event={free.cta.event}
                className="block mt-6 w-full py-3 text-center text-sm font-semibold rounded-xl border-2 border-gray-200 text-gray-800 hover:bg-gray-50 transition-colors"
              >
                {free.cta.label}
              </TrackedLink>
            </div>

            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-8 border border-purple-100/50 relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {credits.badge}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{credits.title}</h3>
              <p className="text-sm text-gray-600 mb-6">{credits.subtitle}</p>
              <CheckList items={credits.items} tone="purple" />
              <TrackedLink
                href={credits.cta.href}
                event={credits.cta.event}
                className="block mt-6 w-full py-3 text-center text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
              >
                {credits.cta.label}
              </TrackedLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
