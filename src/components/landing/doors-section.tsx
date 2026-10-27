import { ArrowRight } from 'lucide-react'
import { DOORS_SECTION } from '@/lib/landing/content'
import type { LandingImage } from '@/lib/landing/images'
import { LandingImageView } from './landing-image'
import { SectionHeading } from './section-heading'
import { SwipeRow } from './swipe-row'
import { TrackedLink } from './tracked-link'

export interface DoorCard {
  key: string
  title: string
  body: string
  meta?: string
  cta: { label: string; href: string; event: string }
  image: LandingImage | null
}

function Door({ door }: { door: DoorCard }) {
  return (
    <TrackedLink
      href={door.cta.href}
      event={door.cta.event}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50">
        {door.image?.kind === 'phone' ? (
          // Phone frame peeks up from the bottom of the card
          <div className="absolute inset-x-0 top-6 flex justify-center">
            <LandingImageView image={door.image} sizes="200px" phoneClassName="max-w-[180px]" />
          </div>
        ) : door.image ? (
          <LandingImageView
            image={door.image}
            sizes="(min-width: 768px) 33vw, 85vw"
            photoClassName="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{door.title}</h3>
        <p className="text-gray-700 leading-relaxed">{door.body}</p>
        {door.meta && <p className="mt-2 text-sm font-medium text-purple-800">{door.meta}</p>}
        <span className="mt-auto pt-5 inline-flex items-center gap-1.5 font-semibold text-purple-700 group-hover:text-purple-900">
          {door.cta.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </TrackedLink>
  )
}

export function DoorsSection({ doors }: { doors: DoorCard[] }) {
  return (
    <section id="doors" className="py-16 md:py-24 scroll-mt-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={DOORS_SECTION.eyebrow} heading={DOORS_SECTION.heading} className="mb-10" />
        <SwipeRow
          label="Ways to Relaks"
          dots
          itemClassName="w-[85%] sm:w-[60%] md:w-auto"
          desktopGridClassName="md:grid-cols-3 md:gap-6"
        >
          {doors.map((door) => (
            <Door key={door.key} door={door} />
          ))}
        </SwipeRow>
      </div>
    </section>
  )
}
