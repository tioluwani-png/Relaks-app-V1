import Image from 'next/image'
import { GALLERY_SECTION } from '@/lib/landing/content'
import type { LandingPost } from '@/lib/landing/data'
import { SectionHeading } from './section-heading'
import { SwipeRow } from './swipe-row'

/** Admin-featured posts. Hidden until at least GALLERY_SECTION.minPosts are featured. */
export function CommunityGallery({ posts }: { posts: LandingPost[] }) {
  if (posts.length < GALLERY_SECTION.minPosts) return null

  return (
    <section id="community" className="py-16 md:py-24 bg-white/40 scroll-mt-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={GALLERY_SECTION.eyebrow} heading={GALLERY_SECTION.heading} color="pink" className="mb-10" />
        <SwipeRow label="Pages colored by the community" arrows itemClassName="w-[60%] sm:w-[35%] md:w-[240px]">
          {posts.map((post) => (
            <figure key={post.id}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-purple-50 shadow-sm">
                <Image
                  src={post.imageUrl}
                  alt={`Coloring page by ${post.colorist}`}
                  fill
                  sizes="(min-width: 768px) 240px, 60vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2 text-sm font-medium text-gray-700 truncate">{post.colorist}</figcaption>
            </figure>
          ))}
        </SwipeRow>
      </div>
    </section>
  )
}
