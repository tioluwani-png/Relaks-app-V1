import { STEPS, STEPS_SECTION } from '@/lib/landing/content'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

export function StepsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-4xl">
        <SectionHeading eyebrow={STEPS_SECTION.eyebrow} heading={STEPS_SECTION.heading} color="orange" />

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.12}>
              <div className="text-center">
                <div className="relative mx-auto mb-5 w-fit">
                  <div className="h-16 w-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    <span className="text-2xl" aria-hidden="true">{step.emoji}</span>
                  </div>
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
