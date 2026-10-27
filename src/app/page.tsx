import { LandingShell } from '@/components/landing/landing-shell'
import { Hero } from '@/components/landing/hero'
import { StatsBar } from '@/components/landing/stats-bar'
import { ProblemSolution } from '@/components/landing/problem-solution'
import { FeaturesSection } from '@/components/landing/features-section'
import { StorySection } from '@/components/landing/story-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { StepsSection } from '@/components/landing/steps-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { FinalCta } from '@/components/landing/final-cta'
import { getActiveEditionNames, getLandingStats, joinNaturally } from '@/lib/landing/stats'
import { SITE_URL, SOCIAL_LINKS } from '@/lib/landing/content'

// Statically rendered, refreshed hourly alongside the cached stats
export const revalidate = 3600

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Relaks',
  url: SITE_URL,
  logo: `${SITE_URL}/logo-square.png`,
  sameAs: [SOCIAL_LINKS.instagram],
}

export default async function Home() {
  const [stats, editionNames] = await Promise.all([getLandingStats(), getActiveEditionNames()])

  return (
    <LandingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Hero />
      <StatsBar stats={stats} />
      <ProblemSolution />
      <FeaturesSection editions={joinNaturally(editionNames)} />
      <StorySection />
      <TestimonialsSection />
      <StepsSection />
      <PricingSection />
      <FinalCta colorists={stats?.colorists ?? null} />
    </LandingShell>
  )
}
