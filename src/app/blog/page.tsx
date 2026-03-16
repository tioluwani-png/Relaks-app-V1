import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { Clock, ArrowRight } from 'lucide-react'
import { BlogHeader } from '@/components/blog/blog-header'
import type { Metadata } from 'next'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  cover_image_url: string | null
  category: string
  published_at: string
  read_time_minutes: number
  author: {
    display_name: string
    avatar_url: string | null
  } | null
}

interface Category {
  name: string
  slug: string
  color: string
}

export const metadata: Metadata = {
  title: 'Blog | Relaks',
  description: 'Wellness tips, coloring guides, and inspiration from the Relaks community.',
  openGraph: {
    title: 'Blog | Relaks',
    description: 'Wellness tips, coloring guides, and inspiration from the Relaks community.',
    type: 'website',
  },
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const supabase = await createClient()
  const { category: selectedCategory } = await searchParams

  // Fetch categories
  const { data: categories } = await supabase
    .from('blog_categories')
    .select('name, slug, color')
    .order('name')

  // Fetch posts
  let query = supabase
    .from('blog_posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      cover_image_url,
      category,
      published_at,
      read_time_minutes,
      author:users!blog_posts_author_id_fkey(display_name, avatar_url)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (selectedCategory) {
    query = query.eq('category', selectedCategory)
  }

  const { data: posts } = await query

  // Get featured post (most recent)
  const featuredPost = posts?.[0] as BlogPost | undefined
  const remainingPosts = (posts?.slice(1) || []) as BlogPost[]
  const allPosts = (posts || []) as BlogPost[]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF5' }}>
      <BlogHeader />

      {/* Hero Header */}
      <section className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white py-16 px-4 overflow-hidden">
        <div className="absolute top-5 left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-5 right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">The Relaks Blog</h1>
          <p className="text-lg md:text-xl opacity-90">
            Wellness tips, coloring inspiration, and stories from our community
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-12 justify-center">
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              !selectedCategory
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
            }`}
          >
            All Posts
          </Link>
          {(categories as Category[] | null)?.map((cat) => (
            <Link
              key={cat.slug}
              href={`/blog?category=${cat.slug}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition shadow-sm ${
                selectedCategory === cat.slug
                  ? 'text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: selectedCategory === cat.slug ? cat.color : undefined,
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Featured Post */}
        {featuredPost && !selectedCategory && (
          <Link href={`/blog/${featuredPost.slug}`} className="block mb-12 group">
            <article className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="md:flex">
                {/* Image */}
                <div className="md:w-1/2 relative aspect-[16/10] md:aspect-auto md:min-h-[320px]">
                  {featuredPost.cover_image_url ? (
                    <Image
                      src={featuredPost.cover_image_url}
                      alt={featuredPost.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full min-h-[200px] bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <Palette className="w-16 h-16 text-purple-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                  <span className="text-purple-500 text-sm font-medium uppercase tracking-wide mb-2">
                    Featured
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{format(new Date(featuredPost.published_at), 'MMM d, yyyy')}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {featuredPost.read_time_minutes} min read
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        )}

        {/* Posts Grid */}
        {(selectedCategory ? allPosts : remainingPosts).length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedCategory ? allPosts : remainingPosts).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <article className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
                  {/* Cover Image */}
                  <div className="relative aspect-[16/10]">
                    {post.cover_image_url ? (
                      <Image
                        src={post.cover_image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <Palette className="w-10 h-10 text-purple-300" />
                      </div>
                    )}
                    {/* Category Badge */}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full text-gray-700 capitalize">
                      {post.category.replace('-', ' ')}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.read_time_minutes} min
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          !featuredPost && (
            <div className="text-center py-16">
              <Palette className="w-16 h-16 text-purple-200 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No posts yet. Check back soon!</p>
            </div>
          )
        )}

        {/* Back to home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            <ArrowRight size={16} className="rotate-180" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

function Palette({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}
