import { ArrowRight, BookOpen, Library, Smartphone, type LucideIcon } from 'lucide-react'
import { DOORS_SECTION } from '@/lib/landing/content'
import type { LandingImage } from '@/lib/landing/images'
import { cn } from '@/lib/utils'
import { LandingImageView } from './landing-image'
import { ACCENTS, Section, SectionHeading, type Accent, type Tone } from './section'
import { SwipeRow } from './swipe-row'
import { TrackedLink } from './tracked-link'

export interface DoorCard {
  key: 'books' | 'club' | 'app'
  title: string
  body: string
  meta?: string
  cta: { label: string; href: string; event: string }
  image: LandingImage | null
}

const DOOR_STYLE: Record<DoorCard['key'], { accent: Accent; Icon: LucideIcon }> = {
  books: { accent: 'coral', Icon: BookOpen },
  club: { accent: 'purple', Icon: Library },
  app: { accent: 'orange', Icon: Smartphone },
}

function Door({ door }: { door: DoorCard }) {
  const { accent, Icon } = DOOR_STYLE[door.key]
  const a = ACCENTS[accent]

  return (
    <TrackedLink
      href={door.cta.href}
      event={door.cta.event}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-relaks-ink/10 bg-white transition-shadow duration-300 hover:shadow-lg"
    >
      <div className={cn('h-1.5', a.bar)} aria-hidden="true" />
      <div className={cn('relative aspect-[16/10] md:aspect-[4/3] overflow-hidden', a.soft)}>
        {door.image?.kind === 'phone' ? (
          // Phone frame peeks up from the bottom of the card
          <div className="absolute inset-x-0 top-4 flex justify-center">
            <LandingImageView image={door.image} sizes="200px" phoneClassName="max-w-[140px] md:max-w-[170px]" />
          </div>
        ) : door.image ? (
          <LandingImageView
            image={door.image}
            sizes="(min-width: 768px) 360px, 85vw"
            photoClassName="absolute inset-0"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn('h-5 w-5', a.icon)} aria-hidden="true" />
          <h3 className="text-lg md:text-xl font-bold text-relaks-ink">{door.title}</h3>
        </div>
        <p className="text-gray-700 leading-relaxed">{door.body}</p>
        {door.meta && <p className={cn('mt-2 text-sm font-semibold', a.text)}>{door.meta}</p>}
        <span className={cn('mt-auto pt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold', a.text)}>
          {door.cta.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </TrackedLink>
  )
}

export function DoorsSection({ doors, tone }: { doors: DoorCard[]; tone: Tone }) {
  return (
    <Section id="doors" tone={tone}>
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={DOORS_SECTION.eyebrow} heading={DOORS_SECTION.heading} />
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
    </Section>
  )
}
