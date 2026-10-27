import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BLOG_SECTION } from '@/lib/landing/content'
import type { LandingBlogPost } from '@/lib/landing/data'
import { Section, SectionHeading, type Tone } from './section'
import { SwipeRow } from './swipe-row'
import { TrackedLink } from './tracked-link'

export function BlogSection({ posts, tone }: { posts: LandingBlogPost[]; tone: Tone }) {
  if (posts.length === 0) return null

  return (
    <Section tone={tone}>
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={BLOG_SECTION.eyebrow} heading={BLOG_SECTION.heading} accent="orange" />
        <SwipeRow
          label="Latest blog posts"
          dots
          itemClassName="w-[85%] sm:w-[60%] md:w-auto"
          desktopGridClassName="md:grid-cols-3 md:gap-6"
        >
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-relaks-ink/10 bg-white"
            >
              <div className="relative aspect-[16/9] bg-relaks-tint">
                {post.coverUrl && (
                  <Image
                    src={post.coverUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 360px, 85vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg md:text-xl font-bold text-relaks-ink leading-snug group-hover:underline underline-offset-2">
                  {post.title}
                </h3>
                {post.excerpt && <p className="mt-2 text-gray-700 leading-relaxed line-clamp-2 md:line-clamp-3">{post.excerpt}</p>}
              </div>
            </Link>
          ))}
        </SwipeRow>
        <div className="mt-4 text-center">
          <TrackedLink
            href={BLOG_SECTION.seeAll.href}
            event={BLOG_SECTION.seeAll.event}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full border-2 border-relaks-ink/25 bg-white px-6 font-semibold text-relaks-ink hover:border-relaks-ink/60"
          >
            {BLOG_SECTION.seeAll.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedLink>
        </div>
      </div>
    </Section>
  )
}
