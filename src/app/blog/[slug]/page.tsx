import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { Clock, Calendar, Eye } from 'lucide-react'
import { BlogHeader } from '@/components/blog/blog-header'
import type { Metadata } from 'next'
import { BlogViewTracker } from './view-tracker'

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
  } | null
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  cover_image_url: string | null
  published_at: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('blog_posts')
    .select('title, excerpt, cover_image_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .single() as { data: { title: string; excerpt: string | null; cover_image_url: string | null } | null; error: unknown }

  if (!data) {
    return { title: 'Post Not Found | Relaks Blog' }
  }

  return {
    title: `${data.title} | Relaks Blog`,
    description: data.excerpt,
    openGraph: {
      title: data.title,
      description: data.excerpt || undefined,
      images: data.cover_image_url ? [data.cover_image_url] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.excerpt || undefined,
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch post
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      content,
      cover_image_url,
      category,
      tags,
      published_at,
      read_time_minutes,
      view_count,
      author:users!blog_posts_author_id_fkey(id, display_name, avatar_url, bio)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single() as { data: BlogPost | null; error: unknown }

  if (error || !post) {
    notFound()
  }

  const typedPost = post as BlogPost

  // Fetch related posts
  const { data: relatedPosts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, cover_image_url, published_at')
    .eq('status', 'published')
    .eq('category', typedPost.category)
    .neq('id', typedPost.id)
    .order('published_at', { ascending: false })
    .limit(3)

  const typedRelated = (relatedPosts || []) as RelatedPost[]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF5' }}>
      {/* Track view on client */}
      <BlogViewTracker postId={typedPost.id} />

      <BlogHeader showBackToBlog />

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          {/* Category */}
          <Link
            href={`/blog?category=${typedPost.category}`}
            className="inline-block text-purple-600 text-sm font-medium uppercase tracking-wide mb-4 hover:text-purple-700 capitalize"
          >
            {typedPost.category.replace('-', ' ')}
          </Link>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {typedPost.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar size={16} />
              {format(new Date(typedPost.published_at), 'MMMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={16} />
              {typedPost.read_time_minutes} min read
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={16} />
              {typedPost.view_count.toLocaleString()} views
            </span>
          </div>

          {/* Author */}
          {typedPost.author && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold overflow-hidden">
                {typedPost.author.avatar_url ? (
                  <Image
                    src={typedPost.author.avatar_url}
                    alt={typedPost.author.display_name}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  typedPost.author.display_name?.charAt(0) || 'R'
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{typedPost.author.display_name}</p>
                {typedPost.author.bio && (
                  <p className="text-sm text-gray-500 line-clamp-1">{typedPost.author.bio}</p>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Cover Image */}
        {typedPost.cover_image_url && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8">
            <Image
              src={typedPost.cover_image_url}
              alt={typedPost.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg prose-purple max-w-none mb-12
            prose-headings:text-gray-900 prose-headings:font-bold
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900
            prose-blockquote:border-l-purple-500 prose-blockquote:bg-purple-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
            prose-img:rounded-xl
            prose-li:text-gray-700"
          dangerouslySetInnerHTML={{ __html: typedPost.content }}
        />

        {/* Tags */}
        {typedPost.tags && typedPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-12 pt-8 border-t border-gray-200">
            {typedPost.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Share CTA */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 text-center mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Enjoyed this article?
          </h3>
          <p className="text-gray-600 mb-4">
            Join our community and start your creative wellness journey.
          </p>
          <Link
            href="/signup"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-medium rounded-full hover:shadow-lg transition-shadow"
          >
            Start Coloring — It&apos;s Free
          </Link>
        </div>

        {/* Related Posts */}
        {typedRelated.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {typedRelated.map((related) => (
                <Link key={related.id} href={`/blog/${related.slug}`} className="group">
                  <article className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <div className="relative aspect-[16/10]">
                      {related.cover_image_url ? (
                        <Image
                          src={related.cover_image_url}
                          alt={related.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          <span className="text-3xl">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-purple-300"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                        {related.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-2">
                        {format(new Date(related.published_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
