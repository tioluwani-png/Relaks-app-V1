import { Palette, Sparkles, BookOpen, PenLine, Brush, Heart, type LucideIcon } from 'lucide-react'
import { FEATURES, FEATURES_SECTION, type FeatureIcon } from '@/lib/landing/content'
import { Reveal } from './reveal'
import { SectionHeading } from './section-heading'

const ICONS: Record<FeatureIcon, LucideIcon> = {
  palette: Palette,
  sparkles: Sparkles,
  book: BookOpen,
  pen: PenLine,
  brush: Brush,
  heart: Heart,
}

/** `editions` is the naturally joined list of active edition names, e.g. "Lavender, Pink and Christmas" */
export function FeaturesSection({ editions }: { editions: string }) {
  return (
    <section id="app" className="py-20 md:py-28 bg-white/40 scroll-mt-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={FEATURES_SECTION.eyebrow} heading={FEATURES_SECTION.heading} className="mb-16" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = ICONS[feature.icon]
            return (
              <Reveal key={feature.title} delay={(i % 3) * 0.12}>
                <div className="bg-white rounded-2xl p-7 border border-gray-100/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className={`h-12 w-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {feature.description.replace('{editions}', editions)}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
