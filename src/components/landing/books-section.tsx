import { ArrowRight, Truck } from 'lucide-react'
import Link from 'next/link'
import { BOOKS_SECTION } from '@/lib/landing/content'
import type { LandingProduct } from '@/lib/landing/data'
import { formatCount } from '@/lib/landing/stats'
import { ProductCard } from './product-card'
import { SectionHeading } from './section-heading'
import { SwipeRow } from './swipe-row'
import { TrackedLink } from './tracked-link'

export function BooksSection({
  products,
  lowestFee,
}: {
  products: LandingProduct[]
  lowestFee: number | null
}) {
  if (products.length === 0) return null

  const delivery = lowestFee !== null
    ? BOOKS_SECTION.delivery.replace('{fee}', formatCount(lowestFee))
    : BOOKS_SECTION.deliveryNoFee

  return (
    <section id="books" className="py-16 md:py-24 bg-white/40 scroll-mt-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={BOOKS_SECTION.eyebrow} heading={BOOKS_SECTION.heading} color="pink" className="mb-10" />

        <SwipeRow label="Relaks shop products" arrows itemClassName="w-[65%] sm:w-[40%] md:w-[260px]">
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

        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <TrackedLink
            href={BOOKS_SECTION.seeAll.href}
            event={BOOKS_SECTION.seeAll.event}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-300 bg-white/70 px-6 py-3 font-semibold text-gray-800 transition-colors hover:border-purple-300 hover:bg-white"
          >
            {BOOKS_SECTION.seeAll.label}
            <ArrowRight className="h-4 w-4" />
          </TrackedLink>
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-gray-700">
            <Truck className="h-4 w-4 text-purple-700" aria-hidden="true" />
            <span>{delivery}</span>
            <Link
              href={BOOKS_SECTION.outsideLagos.href}
              className="font-medium text-purple-800 underline underline-offset-2 hover:text-purple-950"
            >
              {BOOKS_SECTION.outsideLagos.label}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
