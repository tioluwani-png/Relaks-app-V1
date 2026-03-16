'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { FadeInView } from '@/components/shared/motion'
import {
  Palette, Sparkles, ArrowRight, BookOpen, Star,
  PenLine, Brush, Heart,
} from 'lucide-react'

// ============================================
// ANIMATION VARIANTS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

// ============================================
// DATA
// ============================================

const features = [
  {
    icon: Palette,
    title: 'Beautiful color guides',
    description: 'Stuck on what colors to use? Browse our curated palettes and references from the Lavender, Pink, and Christmas editions.',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    icon: Sparkles,
    title: 'Show off your artwork',
    description: 'Upload your finished pages, get inspired by others, and celebrate every colorful moment with the community.',
    color: 'text-pink-500',
    bg: 'bg-pink-50',
  },
  {
    icon: BookOpen,
    title: 'Create custom designs',
    description: 'Imagine any coloring page and watch it come to life. From mandalas to florals, if you can describe it, we can create it.',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    icon: PenLine,
    title: 'Reflect and release',
    description: 'Gentle daily journal prompts to help you process your thoughts, track your mood, and build a streak.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    icon: Brush,
    title: 'Color anywhere',
    description: 'No pencils needed. Choose your colors, pick your brush, and create directly on your phone.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Heart,
    title: "You're not alone",
    description: 'Join a warm community of colorists who get it. Like, comment, and connect with kindred spirits.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
]

const testimonials = [
  {
    name: 'Chisom A.',
    location: 'Lagos',
    quote: "I never thought coloring would help my anxiety, but Relaks makes it feel like therapy without the pressure. I look forward to my coloring time every evening.",
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

const steps = [
  { number: '1', title: 'Create your account', description: 'Sign up free in seconds with email or Google.' },
  { number: '2', title: 'Choose your first page', description: 'Pick from our gallery or create your own with AI.' },
  { number: '3', title: 'Start coloring', description: 'Breathe, relax, and let your creativity flow.' },
]

// ============================================
// PAGE
// ============================================

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: '#FFFBF5' }}>

      {/* ============ NAVBAR ============ */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FFFBF5]/80 border-b border-gray-100/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-6xl">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Relaks"
              width={120}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</a>
            <a href="#experience" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Our Story</a>
            <a href="#pricing" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
            <Link href="/blog" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-full transition-colors">
                Log in
              </button>
            </Link>
            <Link href="/signup">
              <button className="text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/40 hover:shadow-xl hover:scale-105 transition-all duration-300">
                Start Coloring
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32">
        {/* Soft blurred shapes */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-200/25 rounded-full blur-3xl" />
        <div className="absolute top-32 right-1/4 w-56 h-56 bg-orange-100/30 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 max-w-4xl relative text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-purple-100/60"
          >
            <span>Trusted by 8,000+ colorists</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]"
          >
            You&apos;ve done enough today.
            <br />
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent">
              Just RELAKS.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Join thousands finding peace through creative expression.
            Relax, create, and unwind at your own pace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-col items-center gap-3"
          >
            <Link href="/signup">
              <button className="px-8 py-4 text-lg font-semibold text-white rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/50 hover:shadow-xl hover:scale-[1.03] transition-all duration-300">
                Start Coloring — It&apos;s Free
              </button>
            </Link>
            <p className="text-sm text-gray-400">No credit card required</p>
          </motion.div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF BAR ============ */}
      <section className="py-10 bg-white/60 border-y border-gray-100/60">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeInView>
            <div className="flex flex-wrap justify-center gap-10 md:gap-16">
              {[
                { value: '8,000+', label: 'Books Sold' },
                { value: '500+', label: 'Artworks Shared' },
                { value: '4.9', label: 'User Rating' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ============ PROBLEM → SOLUTION ============ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-5xl">
          <FadeInView className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              We get it. Life can feel overwhelming.
            </h2>
          </FadeInView>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Problem */}
            <FadeInView delay={0.1}>
              <div className="space-y-4">
                {[
                  { text: 'Work stress follows you home' },
                  { text: "Your mind won't slow down" },
                  { text: "You're searching for an outlet that doesn't drain you" },
                  { text: 'Scrolling only makes it worse' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                  >
                    <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{['😮\u200d💨', '🌀', '😔', '📱'][i]}</span>
                    </div>
                    <p className="text-gray-600 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </FadeInView>

            {/* Solution */}
            <FadeInView delay={0.25}>
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-8 border border-purple-100/50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Relaks gives you a different kind of escape.
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  No pressure. No judgment. Just you, your colors and a moment to breathe.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Whether you have 5 minutes or an hour, Relaks meets you where you are,
                  helping you relax, create and feel a little lighter.
                </p>
              </div>
            </FadeInView>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-20 md:py-28 bg-white/40">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView className="text-center mb-16">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Everything you need to unwind
            </h2>
          </FadeInView>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <div className="bg-white rounded-2xl p-7 border border-gray-100/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className={`h-12 w-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ THE EXPERIENCE ============ */}
      <section id="experience" className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <FadeInView>
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-8 md:p-14 border border-purple-100/40 text-center">
              <p className="text-sm font-semibold text-purple-500 uppercase tracking-wider mb-4">Our Story</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                More than an app. An experience.
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-left md:text-center">
                <p>
                  Relaks was born from a deeply personal place. The founder&apos;s own journey through
                  grief and anxiety shaped everything about this app.
                </p>
                <p>
                  We didn&apos;t just build features. We built a space where you feel considered,
                  supported and free to express yourself without judgment.
                </p>
                <p>
                  Every detail is intentional. The prompts, the colors, the references,
                  the community. It&apos;s all designed to help you feel a little more at peace.
                </p>
                <p className="font-semibold text-gray-900 pt-2">
                  This isn&apos;t about being artistic. It&apos;s about giving yourself permission to slow down.
                </p>
              </div>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 md:py-28 bg-white/40">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView className="text-center mb-14">
            <p className="text-sm font-semibold text-pink-500 uppercase tracking-wider mb-3">Community</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              What our community says
            </h2>
          </FadeInView>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeInView key={t.name} delay={i * 0.12}>
                <div className="bg-white rounded-2xl p-7 border border-gray-100/80 shadow-sm h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 flex-1 leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.location}</p>
                    </div>
                  </div>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeInView className="text-center mb-14">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-3">Getting Started</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Getting started is easy
            </h2>
          </FadeInView>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <FadeInView key={step.number} delay={i * 0.12}>
                <div className="text-center">
                  <div className="relative mx-auto mb-5 w-fit">
                    <div className="h-16 w-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                      <span className="text-2xl">{['📲', '🎨', '🌸'][i]}</span>
                    </div>
                    <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm">{step.description}</p>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING PREVIEW ============ */}
      <section id="pricing" className="py-20 md:py-28 bg-white/40">
        <div className="container mx-auto px-4 max-w-4xl">
          <FadeInView className="text-center mb-14">
            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Start for free. Upgrade when you&apos;re ready.
            </h2>
          </FadeInView>

          <FadeInView delay={0.1}>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free Tier */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Free</h3>
                <p className="text-sm text-gray-400 mb-6">Everything you need to get started</p>
                <ul className="space-y-3">
                  {[
                    'Upload unlimited artworks',
                    'Daily journaling',
                    'Community access',
                    'Mood tracking and streaks',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-5 w-5 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-500 text-xs font-bold">&#10003;</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block mt-6">
                  <button className="w-full py-3 text-sm font-semibold rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                    Get Started Free
                  </button>
                </Link>
              </div>

              {/* Credits */}
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-8 border border-purple-100/50 relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Popular
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Credits</h3>
                <p className="text-sm text-gray-400 mb-6">For AI pages and exclusive designs</p>
                <ul className="space-y-3">
                  {[
                    'AI-generated coloring pages',
                    'Exclusive premium designs',
                    'Buy as you go, no subscription',
                    'Bundles for better value',
                    'Starting from \u20A6500',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-500 text-xs font-bold">&#10003;</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block mt-6">
                  <button className="w-full py-3 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                    Start Free, Upgrade Later
                  </button>
                </Link>
              </div>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-400/5" />
        <div className="container mx-auto px-4 max-w-3xl relative">
          <FadeInView className="text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-5">
              Your journey to relaxation starts here
            </h2>
            <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
              Take a breath. Pick up your colors.
              Let Relaks be your moment of peace today.
            </p>
            <Link href="/signup">
              <button className="px-8 py-4 text-lg font-semibold text-white rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/50 hover:shadow-xl hover:scale-[1.03] transition-all duration-300">
                Start Coloring — It&apos;s Free
                <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </button>
            </Link>
            <p className="text-sm text-gray-400 mt-4">
              Join 8,000+ people who chose to slow down
            </p>
          </FadeInView>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-gray-100 bg-white/40">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="block mb-4">
                <Image
                  src="/logo.png"
                  alt="Relaks"
                  width={100}
                  height={34}
                  className="h-8 w-auto"
                />
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed">
                Your wellness coloring community. Relax, create, and unwind.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-gray-900">Product</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-gray-700 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-700 transition-colors">Pricing</a></li>
                <li><a href="#experience" className="hover:text-gray-700 transition-colors">Our Story</a></li>
                <li><Link href="/blog" className="hover:text-gray-700 transition-colors">Blog</Link></li>
                <li><Link href="/signup" className="hover:text-gray-700 transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-gray-900">Support</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><a href="mailto:relakswellness.co@gmail.com" className="hover:text-gray-700 transition-colors">Contact</a></li>
                <li><Link href="/login" className="hover:text-gray-700 transition-colors">Log In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-gray-900">Legal</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gray-700 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-10 pt-6">
            <p className="text-sm text-gray-400 text-center">
              &copy; 2026 Relaks. Made with{' '}
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">&#9829;</span>
              {' '}for colorists everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
