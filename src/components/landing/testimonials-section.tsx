import Image from 'next/image'
import { TESTIMONIALS, TESTIMONIALS_SECTION, type Testimonial } from '@/lib/landing/content'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

function Avatar({ testimonial }: { testimonial: Testimonial }) {
  if (testimonial.image) {
    return (
      <Image
        src={testimonial.image}
        alt={testimonial.name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
      {testimonial.name.charAt(0)}
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-white/40">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={TESTIMONIALS_SECTION.eyebrow} heading={TESTIMONIALS_SECTION.heading} color="pink" />

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.12}>
              <figure className="bg-white rounded-2xl p-7 border border-gray-100/80 shadow-sm h-full flex flex-col">
                <blockquote className="text-gray-700 mb-6 flex-1 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <Avatar testimonial={t} />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-600">{t.location}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
