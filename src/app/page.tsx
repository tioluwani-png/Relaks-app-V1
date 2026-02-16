'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Camera, Palette, Flame, Sparkles, ArrowRight, Users,
  BookOpen, Star, Heart, Play
} from 'lucide-react'
import { motion } from 'framer-motion'
import { FadeInView } from '@/components/shared/motion'

const features = [
  {
    icon: Camera,
    title: 'Share Your Art',
    description: 'Upload photos of your completed pages. Get likes, comments, and recognition from fellow colorists.',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    icon: Palette,
    title: 'Find Inspiration',
    description: 'Browse our curated color references organized by edition. No more Pinterest hunting.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Flame,
    title: 'Track Your Wellness',
    description: 'Daily journaling with streak tracking. Build mindful habits that stick.',
    gradient: 'from-orange-400 to-amber-500',
  },
]

const steps = [
  { number: '1', title: 'Create your free account', description: 'Sign up in seconds with email or Google', icon: Users },
  { number: '2', title: 'Upload your first artwork', description: 'Share a photo of your colored page', icon: Camera },
  { number: '3', title: 'Join the community', description: 'Like, comment, and start journaling', icon: Heart },
]

const testimonials = [
  { name: 'Tola A.', role: 'Coloring for 6 months', quote: 'Finally a place to share my colored pages without feeling out of place. The community is so supportive!' },
  { name: 'Chisom O.', role: 'Daily journaler', quote: 'The journal streaks keep me coming back. I have never been this consistent with a wellness habit.' },
  { name: 'Emeka N.', role: 'Casual colorist', quote: 'The AI-generated pages are incredible. I can create exactly what I want to color.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ============ NAVBAR ============ */}
      <header className="sticky top-0 z-50 glass shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-6xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-purple-pink flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold">Relaks</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#ai" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">AI Generation</a>
            <a href="#editions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Editions</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="rounded-xl font-medium">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button className="rounded-xl gradient-purple-pink border-0 text-white font-semibold shadow-[0_4px_14px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.45)] hover:-translate-y-0.5 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative gradient-secondary">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-20 md:py-32 max-w-6xl relative">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm text-sm font-medium text-purple-700 mb-6 border border-purple-100">
                <Sparkles className="h-4 w-4" />
                The home for adult coloring enthusiasts
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
            >
              <span className="gradient-text">Color. Share.</span>
              <br />
              <span className="gradient-text">Relax.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed"
            >
              Upload your colored masterpieces, find inspiration from our curated references,
              and build mindful journaling habits — all in one beautiful space.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
            >
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto rounded-xl gradient-purple-pink border-0 text-white font-semibold text-base px-8 py-6 shadow-[0_4px_14px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.45)] hover:-translate-y-0.5 transition-all">
                  Start Coloring Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl font-semibold text-base px-8 py-6 border-2 hover:bg-white/50">
                  <Play className="mr-2 h-4 w-4" />
                  See How It Works
                </Button>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-sm text-gray-400 flex items-center justify-center gap-4 flex-wrap"
            >
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Join 2,000+ colorists</span>
              <span>Free to start</span>
              <span>No credit card needed</span>
            </motion.p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView className="text-center mb-16">
            <span className="text-sm font-semibold text-purple-500 uppercase tracking-wider">Features</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              Everything you need to color and relax
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A complete wellness platform designed for adult coloring enthusiasts.
            </p>
          </FadeInView>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FadeInView key={feature.title} delay={i * 0.15}>
                <div className="bg-card rounded-2xl p-8 border border-gray-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMMUNITY SHOWCASE ============ */}
      <section className="py-20 md:py-28 gradient-secondary">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView className="text-center mb-16">
            <span className="text-sm font-semibold text-pink-500 uppercase tracking-wider">Community</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              See what our community is creating
            </h2>
          </FadeInView>

          <FadeInView>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50 border border-white/50 shadow-sm flex items-center justify-center group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="text-center">
                    <Palette className="h-8 w-8 text-purple-300 mx-auto mb-2 group-hover:text-purple-400 transition-colors" />
                    <p className="text-xs text-purple-300 font-medium">Artwork</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeInView>

          <FadeInView className="text-center mt-10">
            <Link href="/signup">
              <Button variant="outline" className="rounded-xl font-semibold border-2 hover:bg-white/50">
                View Gallery
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </FadeInView>
        </div>
      </section>

      {/* ============ AI FEATURE HIGHLIGHT ============ */}
      <section id="ai" className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-[0.07]" />
        <div className="container mx-auto px-4 max-w-6xl relative">
          <div className="max-w-2xl mx-auto text-center">
            <FadeInView>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-sm font-semibold text-purple-600 mb-6">
                <Sparkles className="h-4 w-4" />
                NEW: AI-Powered
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Create your own coloring pages
              </h2>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                Type any idea. Get a custom coloring page in seconds.
                From mandalas to landscapes — if you can imagine it, you can color it.
              </p>
            </FadeInView>

            <FadeInView delay={0.2}>
              <div className="bg-card rounded-2xl border shadow-lg p-6 md:p-8 max-w-lg mx-auto">
                <div className="bg-muted rounded-xl p-4 mb-4 text-left">
                  <p className="text-sm text-muted-foreground mb-1">Your prompt</p>
                  <p className="font-medium">&ldquo;A peaceful garden with butterflies and flowers&rdquo;</p>
                </div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border" />
                  <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="aspect-square rounded-xl bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-2 border-dashed border-purple-200 flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="h-10 w-10 text-purple-300 mx-auto mb-3" />
                    <p className="text-sm text-purple-400 font-medium">AI-generated coloring page</p>
                  </div>
                </div>
              </div>
            </FadeInView>

            <FadeInView delay={0.3} className="mt-8">
              <Link href="/signup">
                <Button className="rounded-xl gradient-purple-pink border-0 text-white font-semibold text-base px-8 py-6 shadow-[0_4px_14px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.45)] hover:-translate-y-0.5 transition-all">
                  Try AI Generation
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </FadeInView>
          </div>
        </div>
      </section>

      {/* ============ EDITIONS ============ */}
      <section id="editions" className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView className="text-center mb-16">
            <span className="text-sm font-semibold text-purple-500 uppercase tracking-wider">Our Books</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              Start with our bestselling coloring books
            </h2>
          </FadeInView>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FadeInView delay={0}>
              <div className="bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-3 bg-gradient-to-r from-purple-400 to-violet-500" />
                <div className="p-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-purple-100 to-violet-100 flex items-center justify-center mb-6">
                    <BookOpen className="h-8 w-8 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Lavender Edition</h3>
                  <p className="text-muted-foreground mb-6">40 calming designs for stress relief and relaxation.</p>
                  <Link href="/references/lavender">
                    <Button variant="outline" className="rounded-xl font-medium">See References</Button>
                  </Link>
                </div>
              </div>
            </FadeInView>

            <FadeInView delay={0.15}>
              <div className="bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-3 bg-gradient-to-r from-pink-400 to-rose-500" />
                <div className="p-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-pink-100 to-rose-100 flex items-center justify-center mb-6">
                    <BookOpen className="h-8 w-8 text-pink-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Pink Edition</h3>
                  <p className="text-muted-foreground mb-6">40 creative patterns for self-expression and joy.</p>
                  <Link href="/references/pink">
                    <Button variant="outline" className="rounded-xl font-medium">See References</Button>
                  </Link>
                </div>
              </div>
            </FadeInView>

            <FadeInView delay={0.3}>
              <div className="bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-3 bg-gradient-to-r from-red-500 to-green-600" />
                <div className="p-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-red-100 to-green-100 flex items-center justify-center mb-6">
                    <BookOpen className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Christmas Edition</h3>
                  <p className="text-muted-foreground mb-6">Festive holiday designs to color and celebrate the season.</p>
                  <Link href="/references/christmas">
                    <Button variant="outline" className="rounded-xl font-medium">See References</Button>
                  </Link>
                </div>
              </div>
            </FadeInView>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-20 md:py-28 gradient-secondary">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView className="text-center mb-16">
            <span className="text-sm font-semibold text-orange-500 uppercase tracking-wider">Getting Started</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              Get started in 3 simple steps
            </h2>
          </FadeInView>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <FadeInView key={step.number} delay={i * 0.15}>
                <div className="text-center">
                  <div className="relative mx-auto mb-6 w-fit">
                    <div className="h-16 w-16 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm">
                      <step.icon className="h-7 w-7 text-purple-500" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full gradient-purple-pink text-white text-xs font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </FadeInView>
            ))}
          </div>

          <FadeInView className="text-center mt-12">
            <Link href="/signup">
              <Button className="rounded-xl gradient-purple-pink border-0 text-white font-semibold px-8 py-6 shadow-[0_4px_14px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.45)] hover:-translate-y-0.5 transition-all">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </FadeInView>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView className="text-center mb-16">
            <span className="text-sm font-semibold text-pink-500 uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              Loved by colorists
            </h2>
          </FadeInView>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <FadeInView key={t.name} delay={i * 0.15}>
                <div className="bg-card rounded-2xl p-8 border border-gray-100 shadow-sm h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 flex-1 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full gradient-purple-pink flex items-center justify-center text-white font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="py-16 gradient-secondary">
        <div className="container mx-auto px-4 max-w-6xl">
          <FadeInView>
            <div className="flex flex-wrap justify-center gap-12 md:gap-20">
              {[
                { value: '2,000+', label: 'Active Colorists' },
                { value: '5,000+', label: 'Shared Artworks' },
                { value: '50+', label: 'Coloring Pages' },
                { value: '4.9', label: 'User Rating' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold gradient-text">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 gradient-purple-pink opacity-[0.06]" />
        <div className="container mx-auto px-4 max-w-6xl relative">
          <FadeInView className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to start your coloring journey?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of colorists finding calm, one page at a time.
            </p>
            <Link href="/signup">
              <Button className="rounded-xl gradient-purple-pink border-0 text-white font-semibold text-base px-8 py-6 shadow-[0_4px_14px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.45)] hover:-translate-y-0.5 transition-all">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              Free forever. Premium features available.
            </p>
          </FadeInView>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl gradient-purple-pink flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
                <span className="text-lg font-bold">Relaks</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your wellness coloring community. Color, share, and relax.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#ai" className="hover:text-foreground transition-colors">AI Generation</a></li>
                <li><a href="#editions" className="hover:text-foreground transition-colors">Editions</a></li>
                <li><Link href="/signup" className="hover:text-foreground transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Resources</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Color Tips</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">FAQs</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-10 pt-6">
            <p className="text-sm text-muted-foreground text-center">
              &copy; 2026 Relaks. Made with <span className="text-purple-500">&#9829;</span> for colorists everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
