/**
 * Landing page content and settings.
 * All editable copy, links and settings for the public landing, footer and legal pages live here.
 */

export const SITE_URL = 'https://relaks.co'
export const CONTACT_EMAIL = 'hello@relaks.co'

export const SITE_TITLE = 'Relaks | Adult Coloring Books, Coloring App & Book Club in Lagos'
export const SITE_DESCRIPTION =
  'Beautiful adult coloring books, a calm coloring and journaling app, and a book club that delivers in Lagos.'
export const OG_TAGLINE = "You've done enough today. Just Relaks."

// Social links - leave a value empty to hide its icon
export const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/relaks.coo',
  tiktok: '', // TODO: add TikTok URL
  x: '', // TODO: add X URL
  whatsapp: '', // TODO: add WhatsApp link, e.g. https://wa.me/234XXXXXXXXXX
}

// Shown under the 4.9 rating in the stats bar. Hidden while empty.
// TODO: fill in where the rating comes from, e.g. "Based on 320 reviews on Selar"
export const RATING_SOURCE = ''

// ============================================
// NAVIGATION
// ============================================

export interface NavLink {
  label: string
  href: string
  event: string
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Shop', href: '/shop', event: 'nav_shop' },
  { label: 'Reading Club', href: '/rent', event: 'nav_reading_club' },
  { label: 'The App', href: '/#app', event: 'nav_app' },
  { label: 'Our Story', href: '/#story', event: 'nav_story' },
  { label: 'Blog', href: '/blog', event: 'nav_blog' },
]

export const NAV_LOGIN = { label: 'Log in', href: '/login', event: 'nav_login' }
export const NAV_PRIMARY = { label: 'Start Coloring', href: '/signup', event: 'nav_start' }
export const NAV_OPEN_APP = { label: 'Open the app', href: '/feed', event: 'nav_open_app' }

export interface FooterColumn {
  title: string
  links: NavLink[]
}

export const FOOTER_TAGLINE = 'Your wellness coloring community. Relax, create, and unwind.'

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Shop',
    links: [
      { label: 'Shop', href: '/shop', event: 'footer_shop' },
      { label: 'Reading Club', href: '/rent', event: 'footer_reading_club' },
      { label: 'Distributors', href: '/shop#distributors', event: 'footer_distributors' },
    ],
  },
  {
    title: 'The App',
    links: [
      { label: 'Features', href: '/#app', event: 'footer_features' },
      { label: 'Start free', href: '/signup', event: 'footer_start_free' },
      { label: 'Log in', href: '/login', event: 'footer_login' },
      { label: 'Blog', href: '/blog', event: 'footer_blog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our Story', href: '/#story', event: 'footer_our_story' },
      { label: 'Contact', href: `mailto:${CONTACT_EMAIL}`, event: 'footer_contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy', event: 'footer_privacy' },
      { label: 'Terms', href: '/terms', event: 'footer_terms' },
      { label: 'Delivery & Returns', href: '/delivery-returns', event: 'footer_delivery_returns' },
    ],
  },
]

// ============================================
// HERO
// ============================================

export const HERO = {
  badge: '8,000+ books in homes across Nigeria, Kenya and the UK',
  titleLine1: "You've done enough today.",
  titleLine2: 'Just RELAKS.',
  subline:
    'Join thousands finding peace through creative expression. Relax, create, and unwind at your own pace.',
  primary: { label: 'Shop the books', href: '/shop', event: 'hero_shop' },
  secondary: { label: 'Color free in the app', href: '/signup', event: 'hero_app' },
  note: 'Free to join · Sign up with Google',
}

// ============================================
// STATS BAR
// ============================================

export const STATS = {
  booksSold: '8,000+',
  booksSoldLabel: 'Books sold',
  coloristsLabel: 'Colorists in the app',
  pagesLabel: 'Pages shared',
  rating: '4.9',
  ratingLabel: 'Rating',
}

// ============================================
// PROBLEM -> SOLUTION
// ============================================

export const PROBLEM = {
  heading: 'We get it. Life can feel overwhelming.',
  items: [
    { emoji: '😮‍💨', text: 'Work stress follows you home' },
    { emoji: '🌀', text: "Your mind won't slow down" },
    { emoji: '😔', text: "You're searching for an outlet that doesn't drain you" },
    { emoji: '📱', text: 'Scrolling only makes it worse' },
  ],
  solutionHeading: 'Relaks gives you a different kind of escape.',
  solutionParagraphs: [
    'No pressure. No judgment. Just you, your colors and a moment to breathe.',
    'Whether you have 5 minutes or an hour, Relaks meets you where you are, helping you relax, create and feel a little lighter.',
  ],
}

// ============================================
// FEATURES (THE APP)
// ============================================

export type FeatureIcon = 'palette' | 'sparkles' | 'book' | 'pen' | 'brush' | 'heart'

export interface Feature {
  icon: FeatureIcon
  title: string
  /** `{editions}` is replaced with the active edition names from the database */
  description: string
  color: string
  bg: string
}

export const FEATURES_SECTION = {
  eyebrow: 'Features',
  heading: 'Everything you need to unwind',
}

export const FEATURES: Feature[] = [
  {
    icon: 'palette',
    title: 'Beautiful color guides',
    description: 'Stuck on what colors to use? Browse our curated palettes and references from the {editions} editions.',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    icon: 'sparkles',
    title: 'Show off your artwork',
    description: 'Upload your finished pages, get inspired by others, and celebrate every colorful moment with the community.',
    color: 'text-pink-500',
    bg: 'bg-pink-50',
  },
  {
    icon: 'book',
    title: 'Create custom designs',
    description: 'Imagine any coloring page and watch it come to life. From mandalas to florals, if you can describe it, we can create it.',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    icon: 'pen',
    title: 'Reflect and release',
    description: 'Gentle daily journal prompts to help you process your thoughts, track your mood, and build a streak.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    icon: 'brush',
    title: 'Color anywhere',
    description: 'No pencils needed. Choose your colors, pick your brush, and create directly on your phone.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: 'heart',
    title: "You're not alone",
    description: 'Join a warm community of colorists who get it. Like, comment, and connect with kindred spirits.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
]

// Used when the editions table can't be read
export const FALLBACK_EDITION_NAMES = ['Lavender', 'Pink', 'Christmas']

// ============================================
// OUR STORY
// ============================================

export const STORY = {
  eyebrow: 'Our Story',
  heading: 'More than an app. An experience.',
  paragraphs: [
    "Relaks was born from a deeply personal place. The founder's own journey through grief and anxiety shaped everything about this app.",
    "We didn't just build features. We built a space where you feel considered, supported and free to express yourself without judgment.",
    "Every detail is intentional. The prompts, the colors, the references, the community. It's all designed to help you feel a little more at peace.",
  ],
  closing: "This isn't about being artistic. It's about giving yourself permission to slow down.",
}

// ============================================
// TESTIMONIALS (real quotes, used with permission)
// ============================================

export interface Testimonial {
  name: string
  location: string
  quote: string
  /** Optional photo path, e.g. /landing/chisom.jpg */
  image?: string
}

export const TESTIMONIALS_SECTION = {
  eyebrow: 'Community',
  heading: 'What our community says',
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Chisom A.',
    location: 'Lagos',
    quote: 'I never thought coloring would help my anxiety, but Relaks makes it feel like therapy without the pressure. I look forward to my coloring time every evening.',
  },
  {
    name: 'Adaeze N.',
    location: 'Abuja',
    quote: "The references, the journal prompts, the whole vibe. It's so intentional. You can tell someone really cared about every detail.",
  },
  {
    name: 'Temi O.',
    location: 'London',
    quote: "I bought the book for fun, but the app took it to another level. Now it's part of my self-care routine.",
  },
]

// ============================================
// HOW IT WORKS
// ============================================

export const STEPS_SECTION = {
  eyebrow: 'Getting Started',
  heading: 'Getting started is easy',
}

export const STEPS = [
  { number: '1', emoji: '📲', title: 'Create your account', description: 'Sign up free in seconds with email or Google.' },
  { number: '2', emoji: '🎨', title: 'Choose your first page', description: 'Pick from our gallery or create your own with AI.' },
  { number: '3', emoji: '🌸', title: 'Start coloring', description: 'Breathe, relax, and let your creativity flow.' },
]

// ============================================
// PRICING
// ============================================

export const PRICING_SECTION = {
  eyebrow: 'Pricing',
  heading: "Start for free. Upgrade when you're ready.",
  free: {
    title: 'Free',
    subtitle: 'Everything you need to get started',
    items: ['Upload unlimited artworks', 'Daily journaling', 'Community access', 'Mood tracking and streaks'],
    cta: { label: 'Get Started Free', href: '/signup', event: 'pricing_free' },
  },
  credits: {
    badge: 'Popular',
    title: 'Credits',
    subtitle: 'For AI pages and exclusive designs',
    items: [
      'AI-generated coloring pages',
      'Exclusive premium designs',
      'Buy as you go, no subscription',
      'Bundles for better value',
      'Starting from ₦500',
    ],
    cta: { label: 'Start Free, Upgrade Later', href: '/signup', event: 'pricing_credits' },
  },
}

// ============================================
// FINAL CTA
// ============================================

export const FINAL_CTA = {
  heading: 'Your journey to relaxation starts here',
  subline: 'Take a breath. Pick up your colors. Let Relaks be your moment of peace today.',
  primary: { label: 'Shop the books', href: '/shop', event: 'final_shop' },
  secondary: { label: 'Color free in the app', href: '/signup', event: 'final_app' },
  /** `{colorists}` is replaced with the live colorist count */
  joinLine: 'Join {colorists}+ colorists who chose to slow down',
  joinLineFallback: 'Join thousands of colorists who chose to slow down',
}

// ============================================
// LEGAL
// ============================================

// TODO: update these whenever the policy text changes
export const LEGAL_LAST_UPDATED = {
  privacy: '27 October 2026',
  terms: '27 October 2026',
  deliveryReturns: '27 October 2026',
}
