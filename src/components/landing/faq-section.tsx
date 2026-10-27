import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { FAQ_SECTION } from '@/lib/landing/content'
import { cn } from '@/lib/utils'
import { H2_CLASS, Section, type Tone } from './section'

export interface FaqItem {
  question: string
  /** Plain text, also used for the FAQPage JSON-LD */
  answer: string
  link?: { label: string; href: string }
}

/** Native <details> accordion: works without JavaScript and is keyboard accessible. */
export function FaqSection({ items, tone }: { items: FaqItem[]; tone: Tone }) {
  return (
    <Section id="faq" tone={tone}>
      <div className="container mx-auto px-4 max-w-5xl grid gap-8 md:grid-cols-[1fr_2fr] md:gap-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider mb-2 text-relaks-coral-ink">{FAQ_SECTION.eyebrow}</p>
          <h2 className={H2_CLASS}>{FAQ_SECTION.heading}</h2>
        </div>
        <div className="divide-y divide-relaks-ink/10 border-y border-relaks-ink/10">
          {items.map((item) => (
            <details key={item.question} className="group">
              <summary
                className={cn(
                  'flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-relaks-ink',
                  '[&::-webkit-details-marker]:hidden'
                )}
              >
                {item.question}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-relaks-coral transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="pb-4 text-gray-700 leading-relaxed max-w-[62ch]">
                <p>{item.answer}</p>
                {item.link && (
                  <Link
                    href={item.link.href}
                    className="mt-1 inline-flex min-h-11 items-center font-semibold text-relaks-coral-ink underline underline-offset-2"
                  >
                    {item.link.label}
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}
