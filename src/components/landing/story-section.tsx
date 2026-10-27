import { ArrowRight } from 'lucide-react'
import { BLOG_STORY_URL, FOUNDER_NAME, STORY } from '@/lib/landing/content'
import type { LandingImage } from '@/lib/landing/images'
import { cn } from '@/lib/utils'
import { LandingImageView } from './landing-image'
import { H2_CLASS, Section, type Tone } from './section'
import { TrackedLink } from './tracked-link'

function Milestones({ className }: { className?: string }) {
  return (
    <ul className={cn('grid grid-cols-2 gap-3', className)}>
      {STORY.milestones.map((m) => (
        <li key={m.label} className="rounded-2xl border border-relaks-ink/10 bg-white p-4">
          <p className="text-xl md:text-2xl font-extrabold text-relaks-ink">{m.value}</p>
          <p className="text-sm text-gray-700">{m.label}</p>
        </li>
      ))}
    </ul>
  )
}

/** Two columns: story text, and the founder photo (or the milestones when there's no photo). */
export function StorySection({ founderImage, tone }: { founderImage: LandingImage | null; tone: Tone }) {
  return (
    <Section id="story" tone={tone}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid gap-8 md:grid-cols-2 md:gap-14 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 text-relaks-coral-ink">{STORY.eyebrow}</p>
            <h2 className={cn(H2_CLASS, 'mb-5')}>{STORY.heading}</h2>
            <div className="space-y-3 text-gray-700 leading-relaxed max-w-[60ch]">
              {STORY.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            {FOUNDER_NAME && <p className="mt-4 font-semibold text-relaks-ink">{FOUNDER_NAME}, founder</p>}
            {BLOG_STORY_URL && (
              <TrackedLink
                href={BLOG_STORY_URL}
                event={STORY.readMore.event}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-relaks-coral-ink"
              >
                {STORY.readMore.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            )}
          </div>

          {founderImage ? (
            <LandingImageView
              image={founderImage}
              sizes="(min-width: 768px) 45vw, 90vw"
              photoClassName="aspect-[4/5] w-full max-w-sm mx-auto rounded-3xl"
            />
          ) : (
            <Milestones />
          )}
        </div>

        {founderImage && <Milestones className="mt-10 md:grid-cols-4" />}
      </div>
    </Section>
  )
}
