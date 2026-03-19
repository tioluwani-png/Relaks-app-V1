'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { Clock, ArrowRight, Sparkles, PenLine } from 'lucide-react'
import { motion } from 'framer-motion'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  cover_image_url: string | null
  category: string
  published_at: string
  read_time_minutes: number
}

interface Category {
  name: string
  slug: string
  color: string
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function BlogListing({
  posts,
  categories,
  selectedCategory,
}: {
  posts: BlogPost[]
  categories: Category[]
  selectedCategory?: string
}) {
  const featuredPost = !selectedCategory ? posts[0] : undefined
  const gridPosts = !selectedCategory ? posts.slice(1) : posts

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBvcGFjaXR5PSIuMDUiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0id2hpdGUiLz48L2c+PC9zdmc+')] opacity-40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm font-medium mb-6 border border-white/20">
              <Sparkles size={14} />
              Wellness & Creativity
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
              The Relaks Rage Room
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              A place to rant, share stories, and inspire — for your creative wellness journey!
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        {/* Categories - floating pill bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap gap-2 justify-center bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/5 border border-white/60 px-4 py-3 md:px-6 md:py-4"
        >
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              !selectedCategory
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-200/50'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Posts
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/blog?category=${cat.slug}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedCategory === cat.slug
                  ? 'text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: selectedCategory === cat.slug ? cat.color : undefined,
                boxShadow: selectedCategory === cat.slug ? `0 4px 12px ${cat.color}40` : undefined,
              }}
            >
              {cat.name}
            </Link>
          ))}
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        {/* Featured Post */}
        {featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <Link href={`/blog/${featuredPost.slug}`} className="group block">
              <article className="relative bg-white rounded-3xl overflow-hidden border border-gray-100/80 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="md:flex">
                  <div className="md:w-[55%] relative aspect-[16/10] md:aspect-auto md:min-h-[380px] overflow-hidden">
                    {featuredPost.cover_image_url ? (
                      <Image
                        src={featuredPost.cover_image_url}
                        alt={featuredPost.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-purple-400" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-white/30" />
                  </div>

                  <div className="md:w-[45%] p-6 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles size={12} />
                        Featured
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium capitalize">
                        {featuredPost.category.replace('-', ' ')}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors leading-snug">
                      {featuredPost.title}
                    </h2>
                    <p className="text-gray-500 mb-6 line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span>{format(new Date(featuredPost.published_at), 'MMM d, yyyy')}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {featuredPost.read_time_minutes} min
                        </span>
                      </div>
                      <span className="hidden md:inline-flex items-center gap-1 text-purple-500 text-sm font-medium group-hover:gap-2 transition-all">
                        Read <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          </motion.div>
        )}

        {/* Posts Grid */}
        {gridPosts.length > 0 ? (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {gridPosts.map((post) => (
              <motion.div key={post.id} variants={fadeUp}>
                <Link href={`/blog/${post.slug}`} className="group block h-full">
                  <article className="bg-white rounded-2xl overflow-hidden border border-gray-100/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {post.cover_image_url ? (
                        <Image
                          src={post.cover_image_url}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-purple-400" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-lg text-gray-700 capitalize shadow-sm">
                          {post.category.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                        <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {post.read_time_minutes} min
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          !featuredPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-10 h-10 text-purple-300" />
              </div>
              <p className="text-gray-400 text-lg font-medium">No posts yet</p>
              <p className="text-gray-300 text-sm mt-1">Check back soon for fresh content!</p>
            </motion.div>
          )
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <p className="font-semibold text-gray-900">Got a story to share?</p>
              <p className="text-sm text-gray-500 mt-1">Submit your rants, stories, and inspiration to the Rage Room.</p>
            </div>
            <Link
              href="/blog/submit"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-lg shadow-purple-200/40 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <PenLine size={16} />
              Submit Your Story
            </Link>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Relaks. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
              <Link href="/blog/submit" className="hover:text-gray-600 transition-colors">Submit Story</Link>
              <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
