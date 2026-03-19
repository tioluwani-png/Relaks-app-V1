import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BlogHeader } from '@/components/blog/blog-header'
import { BlogPostContent } from '@/components/blog/blog-post-content'
import { BlogViewTracker } from './view-tracker'
import type { Metadata } from 'next'

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

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`
      id, title, slug, excerpt, content, cover_image_url,
      category, tags, published_at, read_time_minutes, view_count,
      author:users!blog_posts_author_id_fkey(id, display_name, avatar_url, bio, is_verified, verification_type)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single() as { data: any | null; error: unknown }

  if (error || !post) {
    notFound()
  }

  const { data: relatedPosts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, cover_image_url, published_at')
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF5' }}>
      <BlogViewTracker postId={post.id} />
      <BlogHeader showBackToBlog />
      <BlogPostContent
        post={post}
        relatedPosts={(relatedPosts || []) as any}
      />
    </div>
  )
}
