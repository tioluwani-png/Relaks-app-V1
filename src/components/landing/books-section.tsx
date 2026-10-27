import { ArrowRight, Truck } from 'lucide-react'
import Link from 'next/link'
import { BOOKS_SECTION } from '@/lib/landing/content'
import type { LandingProduct } from '@/lib/landing/data'
import { formatCount } from '@/lib/landing/stats'
import { ProductCard } from './product-card'
import { Section, SectionHeading, type Tone } from './section'
import { SwipeRow } from './swipe-row'
import { TrackedLink } from './tracked-link'

export function BooksSection({
  products,
  lowestFee,
  hasDistributors,
  tone,
}: {
  products: LandingProduct[]
  lowestFee: number | null
  /** When false, "Outside Lagos?" links to the delivery page instead of #outside-lagos */
  hasDistributors: boolean
  tone: Tone
}) {
  if (products.length === 0) return null

  const delivery = lowestFee !== null
    ? BOOKS_SECTION.delivery.replace('{fee}', formatCount(lowestFee))
    : BOOKS_SECTION.deliveryNoFee
  const outside = BOOKS_SECTION.outsideLagos

  return (
    <Section id="books" tone={tone}>
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={BOOKS_SECTION.eyebrow} heading={BOOKS_SECTION.heading} accent="coral" />

        <SwipeRow label="Relaks shop products" arrows itemClassName="w-[52%] sm:w-[36%] md:w-[250px]">
          {products.map((p) => (
            <ProductCard
              key={p.product.id}
              product={p.product}
              price={p.price}
              compareAt={p.compareAt}
              fromPrice={p.fromPrice}
              inStock={p.inStock}
            />
          ))}
        </SwipeRow>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <TrackedLink
            href={BOOKS_SECTION.seeAll.href}
            event={BOOKS_SECTION.seeAll.event}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full border-2 border-relaks-ink/25 bg-white px-6 font-semibold text-relaks-ink transition-colors hover:border-relaks-ink/60"
          >
            {BOOKS_SECTION.seeAll.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedLink>
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-gray-700">
            <Truck className="h-4 w-4 text-relaks-coral" aria-hidden="true" />
            <span>{delivery}</span>
            <Link
              href={hasDistributors ? outside.href : outside.fallbackHref}
              className="inline-flex min-h-11 items-center font-semibold text-relaks-coral-ink underline underline-offset-2"
            >
              {outside.label}
            </Link>
          </p>
        </div>
      </div>
    </Section>
  )
}
