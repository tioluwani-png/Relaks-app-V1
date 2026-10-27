import { PROBLEM } from '@/lib/landing/content'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

export function ProblemSolution() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-5xl">
        <SectionHeading heading={PROBLEM.heading} />

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <Reveal delay={0.1}>
            <div className="space-y-4">
              {PROBLEM.items.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg" aria-hidden="true">{item.emoji}</span>
                  </div>
                  <p className="text-gray-700 font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-8 border border-purple-100/50">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{PROBLEM.solutionHeading}</h3>
              <div className="space-y-4">
                {PROBLEM.solutionParagraphs.map((p) => (
                  <p key={p} className="text-gray-700 leading-relaxed">{p}</p>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
