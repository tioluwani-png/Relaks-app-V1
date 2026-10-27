import { LandingShell } from '@/components/landing/landing-shell'
import { Hero } from '@/components/landing/hero'
import { StatsBar } from '@/components/landing/stats-bar'
import { DoorsSection, type DoorCard } from '@/components/landing/doors-section'
import { BooksSection } from '@/components/landing/books-section'
import { AppSection } from '@/components/landing/app-section'
import { CommunityGallery } from '@/components/landing/community-gallery'
import { StorySection } from '@/components/landing/story-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { StepsSection } from '@/components/landing/steps-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { FinalCta } from '@/components/landing/final-cta'
import { MobileStickyBar } from '@/components/landing/mobile-sticky-bar'
import { formatCount, getActiveEditionNames, getLandingStats, joinNaturally } from '@/lib/landing/stats'
import { adultBooks, getFeaturedPosts, getLandingClubInfo, getLandingProducts, getLowestZoneFee } from '@/lib/landing/data'
import { getLandingImages } from '@/lib/landing/images'
import { DOORS, SITE_URL, SOCIAL_LINKS } from '@/lib/landing/content'

// Statically rendered, refreshed hourly alongside the cached data
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
  const [stats, editionNames, products, lowestFee, club, featuredPosts, images] = await Promise.all([
    getLandingStats(),
    getActiveEditionNames(),
    getLandingProducts(),
    getLowestZoneFee(),
    getLandingClubInfo(),
    getFeaturedPosts(),
    getLandingImages(),
  ])

  const editions = joinNaturally(editionNames)

  // "From ₦X" uses adult coloring books, so stationery and kids kits don't set the floor
  const adultPrices = adultBooks(products).map((p) => p.price)
  const lowestPrice = adultPrices.length > 0 ? Math.min(...adultPrices) : null

  const doors: DoorCard[] = [
    {
      key: 'books',
      title: DOORS.books.title,
      body: (lowestPrice !== null ? DOORS.books.body : DOORS.books.bodyNoPrice)
        .replace('{editions}', editions)
        .replace('{price}', lowestPrice !== null ? formatCount(lowestPrice) : ''),
      cta: DOORS.books.cta,
      image: images.doorBooks,
    },
    {
      key: 'club',
      title: DOORS.club.title,
      body: club.plan?.description?.trim() || DOORS.club.body,
      meta: club.plan ? DOORS.club.meta.replace('{price}', formatCount(club.plan.price_naira)) : undefined,
      cta: DOORS.club.cta,
      image: images.doorClub,
    },
    {
      key: 'app',
      title: DOORS.app.title,
      body: DOORS.app.body,
      cta: DOORS.app.cta,
      image: images.doorApp,
    },
  ]

  return (
    <LandingShell after={<MobileStickyBar />}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Hero image={images.hero} />
      <StatsBar stats={stats} />
      <DoorsSection doors={doors} />
      <BooksSection products={products} lowestFee={lowestFee} />
      <AppSection editions={editions} images={images} />
      <CommunityGallery posts={featuredPosts} />
      <StorySection />
      <TestimonialsSection />
      <StepsSection />
      <PricingSection />
      <FinalCta colorists={stats?.colorists ?? null} />
    </LandingShell>
  )
}
