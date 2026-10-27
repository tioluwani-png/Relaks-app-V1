import { Fragment, type ReactNode } from 'react'
import { LandingShell } from '@/components/landing/landing-shell'
import { Hero } from '@/components/landing/hero'
import { StatsBar } from '@/components/landing/stats-bar'
import { DoorsSection, type DoorCard } from '@/components/landing/doors-section'
import { BooksSection } from '@/components/landing/books-section'
import { AppSection } from '@/components/landing/app-section'
import { CommunityGallery } from '@/components/landing/community-gallery'
import { ReadingClubSection } from '@/components/landing/reading-club-section'
import { StorySection } from '@/components/landing/story-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { OutsideLagosSection } from '@/components/landing/outside-lagos-section'
import { FaqSection, type FaqItem } from '@/components/landing/faq-section'
import { BlogSection } from '@/components/landing/blog-section'
import { FinalCta } from '@/components/landing/final-cta'
import { MobileStickyBar } from '@/components/landing/mobile-sticky-bar'
import { HeroColoringCard } from '@/components/landing/hero-coloring-card'
import { LandingImageView } from '@/components/landing/landing-image'
import { FloatingPencilsLoader } from '@/components/landing/floating-pencils-loader'
import { AiScreen, CanvasScreen, JournalScreen, ReferencesScreen } from '@/components/landing/app-screens'
import type { Tone } from '@/components/landing/section'
import { formatCount, getActiveEditionNames, getLandingStats, joinNaturally } from '@/lib/landing/stats'
import {
  adultBooks,
  getDistributors,
  getAppScreenData,
  getFeaturedPosts,
  getLandingClubInfo,
  getLandingProducts,
  getLatestBlogPosts,
  getLowestZoneFee,
  getRentalPlans,
  getZoneSummary,
  type LandingDistributor,
  type LandingPlan,
  type ZoneSummary,
} from '@/lib/landing/data'
import { getLandingImages } from '@/lib/landing/images'
import { getAppPreviewArt, getHeroArt } from '@/lib/landing/hero-art'
import { christmasBanner, isChristmasSeason } from '@/lib/landing/season'
import { APP_SECTION, CHRISTMAS, DOORS, FAQ_SECTION, GALLERY_SECTION, HERO, HERO_COLORING, PENCILS, SITE_URL, SOCIAL_LINKS } from '@/lib/landing/content'
import { PRICING } from '@/lib/paystack'
import { categoryLabels, getTodaysPrompt } from '@/lib/journal-prompts'
import { UNRETURNED_DAYS_THRESHOLD } from '@/lib/rental/config'

// Statically rendered, refreshed hourly alongside the cached data
export const revalidate = 3600

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Relaks',
  url: SITE_URL,
  logo: `${SITE_URL}/logo-square.png`,
  // Public profiles only (WhatsApp is a chat link, not a profile)
  sameAs: [SOCIAL_LINKS.instagram, SOCIAL_LINKS.tiktok, SOCIAL_LINKS.x].filter(Boolean),
}

const naira = (n: number) => `₦${formatCount(n)}`

/** FAQ answers built from live data where possible. */
function buildFaq(zones: ZoneSummary | null, distributors: LandingDistributor[], plans: LandingPlan[]): FaqItem[] {
  const deliveryPage = { label: 'Delivery & Returns', href: '/delivery-returns' }

  const days = !zones
    ? null
    : zones.minDays === zones.maxDays
      ? `${zones.minDays} working day${zones.minDays === 1 ? '' : 's'}`
      : `${zones.minDays}–${zones.maxDays} working days`

  const swapLines = plans.map((plan) =>
    plan.swap_frequency === 'monthly'
      ? `On the ${plan.name} plan we swap your books every month, collecting the ones you've finished when we bring the next ones.`
      : `On the ${plan.name} plan your books arrive together and we collect them at the end of your term.`
  )

  return [
    {
      question: 'How long does delivery take?',
      answer: days
        ? `Lagos orders usually arrive in ${days}, depending on your area.`
        : 'Delivery times for your area are shown at checkout.',
      link: deliveryPage,
    },
    {
      question: 'How much is delivery?',
      answer: zones
        ? zones.minFee === zones.maxFee
          ? `Delivery within Lagos costs ${naira(zones.minFee)}.`
          : `Delivery within Lagos costs ${naira(zones.minFee)} to ${naira(zones.maxFee)}, depending on your area. You'll see the exact fee at checkout.`
        : "You'll see the delivery fee for your area at checkout.",
      link: { label: 'See all delivery zones', href: '/delivery-returns' },
    },
    {
      question: 'Do you deliver outside Lagos?',
      answer: distributors.length > 0
        ? `We deliver within Lagos ourselves. Outside Lagos, you can order from our distributors in ${joinNaturally([...new Set(distributors.map((d) => d.city))])} on WhatsApp.`
        : 'Right now we deliver within Lagos only.',
      link: distributors.length > 0 ? { label: 'Find a distributor', href: '#outside-lagos' } : undefined,
    },
    {
      question: 'How do Reading Club swaps and returns work?',
      answer: [
        ...(swapLines.length > 0 ? swapLines : ['We deliver your books and collect them when your rental ends.']),
        `Books not returned within ${UNRETURNED_DAYS_THRESHOLD} days of your rental ending may be charged at their replacement value.`,
      ].join(' '),
      link: { label: 'Reading Club terms', href: '/rent/terms' },
    },
    {
      question: 'Is the app free?',
      answer: `Yes. Journaling, color references for your book and the community are free. AI-generated pages are from ${naira(PRICING.aiStarter)} each, with no subscription. Digital coloring in the app is coming soon.`,
    },
    {
      question: 'How can I pay?',
      answer: FAQ_SECTION.paymentMethods,
    },
    {
      question: 'Can I return an order?',
      answer: 'Yes. Our Delivery & Returns page explains what can be returned, how, and what to do if something arrives damaged.',
      link: deliveryPage,
    },
  ]
}

export default async function Home() {
  const [
    stats, editionNames, products, lowestFee, club, featuredPosts, images,
    plans, distributors, zones, blogPosts, appScreenData,
  ] = await Promise.all([
    getLandingStats(),
    getActiveEditionNames(),
    getLandingProducts(),
    getLowestZoneFee(),
    getLandingClubInfo(),
    getFeaturedPosts(),
    getLandingImages(),
    getRentalPlans(),
    getDistributors(),
    getZoneSummary(),
    getLatestBlogPosts(),
    getAppScreenData(),
  ])

  const editions = joinNaturally(editionNames)

  // Christmas season mode switches itself on and off by date (Lagos time)
  const christmas = isChristmasSeason()
  const coloring = christmas ? HERO_COLORING.christmas : HERO_COLORING.default
  const heroSvg = getHeroArt(christmas ? 'christmas' : 'default', coloring.prefill)
  const christmasProduct = products.find((p) => p.isChristmas)
  const christmasImage = christmasProduct?.product.images[0]
  const pencilPalette = christmas ? PENCILS.christmasPalette : PENCILS.palette

  // App section phones, built from real content (a screenshot in public/landing/ still wins)
  const previewSvg = getAppPreviewArt(
    christmas ? 'christmas' : 'default',
    coloring.palette.map((swatch) => swatch.hex),
    christmas ? { ...coloring.prefill, r4: '#1B7A43', r5: '#1B7A43' } : coloring.prefill
  )
  const todaysPrompt = getTodaysPrompt()
  // Until the team has an AI page to show, the AI phone shows the hero page as line art with a matching prompt
  const lineArt = appScreenData.aiExample ? null : getAppPreviewArt(christmas ? 'christmas' : 'default', [])
  const aiExample = appScreenData.aiExample
    ? appScreenData.aiExample
    : lineArt
      ? { prompt: APP_SECTION.aiFallbackPrompt, svg: lineArt, label: APP_SECTION.aiFallbackLabel }
      : null
  const appScreens = {
    ...(appScreenData.reference ? { appReferences: <ReferencesScreen reference={appScreenData.reference} /> } : {}),
    ...(aiExample ? { appFeed: <AiScreen example={aiExample} price={naira(PRICING.aiStarter)} /> } : {}),
    appJournal: <JournalScreen prompt={todaysPrompt.text} category={categoryLabels[todaysPrompt.category]} />,
    ...(previewSvg
      ? {
          appCanvas: (
            <CanvasScreen
              svg={previewSvg}
              palette={coloring.palette.map((swatch) => swatch.hex)}
              comingSoon={APP_SECTION.comingSoon}
            />
          ),
        }
      : {}),
  }

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
      meta: christmas ? CHRISTMAS.giftLine : undefined,
      cta: DOORS.books.cta,
      image:
        christmas && christmasProduct && christmasImage
          ? { kind: 'photo', src: christmasImage, alt: christmasProduct.product.name }
          : images.doorBooks,
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

  const faq = buildFaq(zones, distributors, plans)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  // Only sections that will render, so the cream/tint alternation never repeats a colour
  const candidates: (((tone: Tone) => ReactNode) | null)[] = [
    (tone: Tone) => <StatsBar stats={stats} tone={tone} />,
    (tone: Tone) => <DoorsSection doors={doors} tone={tone} />,
    products.length > 0
      ? (tone: Tone) => (
          <BooksSection
            products={products}
            lowestFee={lowestFee}
            hasDistributors={distributors.length > 0}
            christmas={christmas}
            tone={tone}
          />
        )
      : null,
    (tone: Tone) => <AppSection editions={editions} images={images} screens={appScreens} tone={tone} />,
    featuredPosts.length >= GALLERY_SECTION.minPosts
      ? (tone: Tone) => <CommunityGallery posts={featuredPosts} tone={tone} />
      : null,
    (tone: Tone) => <ReadingClubSection plans={plans} tone={tone} />,
    (tone: Tone) => <StorySection founderImage={images.founder} tone={tone} />,
    (tone: Tone) => <TestimonialsSection tone={tone} />,
    distributors.length > 0 ? (tone: Tone) => <OutsideLagosSection distributors={distributors} tone={tone} /> : null,
    (tone: Tone) => <FaqSection items={faq} tone={tone} />,
    blogPosts.length > 0 ? (tone: Tone) => <BlogSection posts={blogPosts} tone={tone} /> : null,
    (tone: Tone) => <FinalCta colorists={stats?.colorists ?? null} tone={tone} pencilPalette={pencilPalette} />,
  ]
  const blocks = candidates.filter((block): block is (tone: Tone) => ReactNode => block !== null)

  // The hero is cream, so the first block is tint
  const toneAt = (i: number): Tone => (i % 2 === 0 ? 'tint' : 'cream')
  const lastTone = toneAt(blocks.length - 1)

  return (
    <LandingShell
      footerTone={lastTone === 'tint' ? 'cream' : 'tint'}
      banner={christmasBanner()}
      after={<MobileStickyBar />}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero
        eyebrow={christmas ? CHRISTMAS.heroEyebrow : undefined}
        snow={christmas}
        background={
          <FloatingPencilsLoader
            containerId="hero"
            count={PENCILS.heroPhone}
            desktopCount={PENCILS.heroDesktop}
            palette={pencilPalette}
            hover
            listenFills
            tapEvent={PENCILS.tapEvent}
          />
        }
        aside={
          heroSvg ? (
            <HeroColoringCard
              svg={heroSvg}
              season={christmas ? 'christmas' : 'default'}
              ariaLabel={coloring.ariaLabel}
              caption={coloring.caption}
              palette={coloring.palette}
              completeHeading={coloring.completeHeading}
              shopHref={christmas && christmasProduct ? `/shop/${christmasProduct.product.slug}` : '/shop'}
              shopLabel={christmas ? HERO_COLORING.shopCta.label : HERO.primary.label}
            />
          ) : images.hero ? (
            <div data-pencils-avoid className="mx-auto w-full max-w-[220px] sm:max-w-xs lg:max-w-none">
            <LandingImageView
              image={images.hero}
              preload
              sizes="(min-width: 1024px) 460px, (min-width: 640px) 320px, 220px"
              photoClassName="w-full aspect-[4/5] rounded-3xl"
            />
            </div>
          ) : undefined
        }
      />
      {blocks.map((render, i) => (
        <Fragment key={i}>{render(toneAt(i))}</Fragment>
      ))}
    </LandingShell>
  )
}
