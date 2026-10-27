import { STORY } from '@/lib/landing/content'
import { Reveal } from './reveal'

export function StorySection() {
  return (
    <section id="story" className="py-20 md:py-28 scroll-mt-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <Reveal>
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-8 md:p-14 border border-purple-100/40 text-center">
            <p className="text-sm font-semibold text-purple-700 uppercase tracking-wider mb-4">{STORY.eyebrow}</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{STORY.heading}</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed text-left md:text-center">
              {STORY.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className="font-semibold text-gray-900 pt-2">{STORY.closing}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
