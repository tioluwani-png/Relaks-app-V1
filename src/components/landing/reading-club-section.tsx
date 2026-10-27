import { ListChecks, MapPin, Repeat, Truck, type LucideIcon } from 'lucide-react'
import { READING_CLUB_SECTION } from '@/lib/landing/content'
import type { LandingPlan } from '@/lib/landing/data'
import { formatCount } from '@/lib/landing/stats'
import { cn } from '@/lib/utils'
import { CtaButton } from './cta-button'
import { ACCENTS, H2_CLASS, Section, type Tone } from './section'
import { SwipeRow } from './swipe-row'

const STEP_ICONS: Record<(typeof READING_CLUB_SECTION.steps)[number]['icon'], LucideIcon> = {
  list: ListChecks,
  truck: Truck,
  repeat: Repeat,
}

function naira(n: number) {
  return `₦${formatCount(n)}`
}

/** "a month", "for 3 months", "for 45 days" */
function termLabel(days: number) {
  if (days === 30) return 'a month'
  if (days % 30 === 0) return `for ${days / 30} months`
  return `for ${days} days`
}

function PlanCard({ plan }: { plan: LandingPlan }) {
  const rows = [
    { label: 'Books', value: `${plan.books_per_cycle} ${plan.books_per_cycle === 1 ? 'book' : 'books'}` },
    { label: 'Price', value: `${naira(plan.price_naira)} ${termLabel(plan.duration_days)}` },
    { label: 'Delivery', value: plan.delivery_included ? 'Included' : 'Added at checkout' },
  ]

  return (
    <div className="h-full rounded-2xl border border-relaks-purple/30 bg-white p-5 md:p-6">
      <h3 className="text-lg md:text-xl font-bold text-relaks-ink">{plan.name}</h3>
      {plan.description && <p className="mt-1 text-sm text-gray-700 leading-relaxed">{plan.description}</p>}
      <dl className="mt-4 divide-y divide-relaks-ink/10 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-2">
            <dt className="text-gray-700">{row.label}</dt>
            <dd className="font-medium text-relaks-ink text-right">{row.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 pt-3">
          <dt className="font-semibold text-relaks-ink">Total</dt>
          <dd className="text-lg font-bold text-relaks-purple-ink">
            {naira(plan.price_naira)}
            {!plan.delivery_included && <span className="text-sm font-medium text-gray-700"> + delivery</span>}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function ReadingClubSection({ plans, tone }: { plans: LandingPlan[]; tone: Tone }) {
  const s = READING_CLUB_SECTION
  const accent = ACCENTS.purple

  return (
    <Section id="reading-club" tone={tone}>
      <div className="container mx-auto px-4 max-w-6xl grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:items-start">
        <div>
          <p className={cn('text-sm font-semibold uppercase tracking-wider mb-2', accent.text)}>{s.eyebrow}</p>
          <h2 className={cn(H2_CLASS, 'mb-6')}>{s.heading}</h2>
          <ol className="space-y-3">
            {s.steps.map((step, i) => {
              const Icon = STEP_ICONS[step.icon]
              return (
                <li key={step.title} className="flex gap-4">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', accent.soft)}>
                    <Icon className={cn('h-5 w-5', accent.icon)} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-relaks-ink">
                      <span className="sr-only">Step {i + 1}: </span>
                      {step.title}
                    </p>
                    <p className="text-gray-700">{step.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-relaks-purple/40 bg-white px-4 py-2 text-sm font-semibold text-relaks-purple-ink">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {s.lagosOnly}
          </p>
        </div>

        <div>
          {plans.length > 0 && (
            <>
              <h3 className="sr-only">{s.plansHeading}</h3>
              <SwipeRow
                label="Reading Club plans"
                dots={plans.length > 1}
                itemClassName="w-[85%] sm:w-[60%] md:w-auto"
                desktopGridClassName={plans.length > 1 ? 'md:grid-cols-2 md:gap-4' : 'md:grid-cols-1'}
              >
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </SwipeRow>
            </>
          )}
          <div className="mt-4 text-center lg:text-left">
            <CtaButton href={s.cta.href} event={s.cta.event} size="md">
              {s.cta.label}
            </CtaButton>
          </div>
        </div>
      </div>
    </Section>
  )
}
