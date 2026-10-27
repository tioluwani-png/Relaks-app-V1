import Image from 'next/image'
import { GALLERY_SECTION } from '@/lib/landing/content'
import type { LandingPost } from '@/lib/landing/data'
import { Section, SectionHeading, type Tone } from './section'
import { SwipeRow } from './swipe-row'

/** Admin-featured posts. Hidden until at least GALLERY_SECTION.minPosts are featured. */
export function CommunityGallery({ posts, tone }: { posts: LandingPost[]; tone: Tone }) {
  if (posts.length < GALLERY_SECTION.minPosts) return null

  return (
    <Section id="community" tone={tone}>
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeading eyebrow={GALLERY_SECTION.eyebrow} heading={GALLERY_SECTION.heading} />
        <SwipeRow label="Pages colored by the community" arrows itemClassName="w-[55%] sm:w-[35%] md:w-[220px]">
          {posts.map((post) => (
            <figure key={post.id}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-relaks-tint">
                <Image
                  src={post.imageUrl}
                  alt={`Coloring page by ${post.colorist}`}
                  fill
                  sizes="(min-width: 768px) 220px, 55vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2 text-sm font-medium text-gray-700 truncate">{post.colorist}</figcaption>
            </figure>
          ))}
        </SwipeRow>
      </div>
    </Section>
  )
}
