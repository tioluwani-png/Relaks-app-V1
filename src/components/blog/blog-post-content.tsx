'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { Clock, Calendar, Eye, ArrowRight, Sparkles } from 'lucide-react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { BlogComments } from './blog-comments'
import { formatBlogContent } from '@/lib/formatBlogContent'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image_url: string | null
  category: string
  tags: string[]
  published_at: string
  read_time_minutes: number
  view_count: number
  author: {
    id: string
    display_name: string
    avatar_url: string | null
    bio: string | null
    is_verified: boolean
  } | null
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  cover_image_url: string | null
  published_at: string
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function BlogPostContent({
  post,
  relatedPosts,
}: {
  post: BlogPost
  relatedPosts: RelatedPost[]
}) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  return (
    <>
      {/* Reading progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 origin-left z-50"
      />

      {/* Hero cover */}
      {post.cover_image_url ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative w-full aspect-[21/9] md:aspect-[3/1] max-h-[480px] overflow-hidden"
        >
          <Image
            src={post.cover_image_url}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FFFBF5] via-transparent to-transparent" />
        </motion.div>
      ) : (
        <div className="h-8" />
      )}

      <article className={`max-w-3xl mx-auto px-4 ${post.cover_image_url ? '-mt-20 relative z-10' : 'pt-8'}`}>
        {/* Article header card */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-5">
            <Link
              href={`/blog?category=${post.category}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 text-xs font-semibold uppercase tracking-wider hover:from-purple-500/20 hover:to-pink-500/20 transition-colors capitalize"
            >
              {post.category.replace('-', ' ')}
            </Link>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 leading-[1.15] tracking-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-gray-500 mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Meta bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-100">
            <span className="flex items-center gap-1.5">
              <Calendar size={15} />
              {format(new Date(post.published_at), 'MMMM d, yyyy')}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <Clock size={15} />
              {post.read_time_minutes} min read
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <Eye size={15} />
              {post.view_count.toLocaleString()} views
            </span>
          </div>

          {/* Author */}
          {post.author && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-purple-400 to-pink-400">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {post.author.avatar_url ? (
                    <Image
                      src={post.author.avatar_url}
                      alt={post.author.display_name}
                      width={44}
                      height={44}
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-bold text-purple-500">
                      {post.author.display_name?.charAt(0) || 'R'}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900 text-sm">{post.author.display_name}</p>
                  {post.author.is_verified && (
                    <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {post.author.bio && (
                  <p className="text-xs text-gray-400 line-clamp-1">{post.author.bio}</p>
                )}
              </div>
            </div>
          )}
        </motion.header>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="blog-content prose prose-lg prose-purple max-w-none mb-14
            prose-headings:text-gray-900 prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-gray-600 prose-p:leading-[1.8]
            prose-a:text-purple-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-800
            prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:bg-gradient-to-r prose-blockquote:from-purple-50 prose-blockquote:to-transparent prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
            prose-img:rounded-2xl prose-img:shadow-lg
            prose-li:text-gray-600 prose-li:leading-[1.8]
            prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
          dangerouslySetInnerHTML={{ __html: formatBlogContent(post.content) }}
        />

        {/* Comments */}
        <BlogComments blogPostId={post.id} slug={post.slug} />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap gap-2 mb-14 pt-8 border-t border-gray-100"
          >
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 text-sm rounded-xl transition-colors cursor-default border border-gray-100"
              >
                #{tag}
              </span>
            ))}
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-center mb-14"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBvcGFjaXR5PSIuMDUiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0id2hpdGUiLz48L2c+PC9zdmc+')] opacity-40" />
          <div className="relative">
            <h3 className="text-2xl font-bold text-white mb-2">
              Enjoyed this article?
            </h3>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              Join our community of creative wellness enthusiasts
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-purple-600 font-semibold rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Start Coloring — It&apos;s Free
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="pb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Keep Reading</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedPosts.map((related) => (
                <Link key={related.id} href={`/blog/${related.slug}`} className="group block">
                  <article className="bg-white rounded-2xl overflow-hidden border border-gray-100/80 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {related.cover_image_url ? (
                        <Image
                          src={related.cover_image_url}
                          alt={related.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-purple-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2 leading-snug">
                        {related.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(related.published_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </article>
    </>
  )
}
