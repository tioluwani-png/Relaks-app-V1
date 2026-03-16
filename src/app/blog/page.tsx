import { createClient } from '@/lib/supabase/server'
import { BlogHeader } from '@/components/blog/blog-header'
import { BlogListing } from '@/components/blog/blog-listing'
import type { Metadata } from 'next'

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

  const { data: categories } = await supabase
    .from('blog_categories')
    .select('name, slug, color')
    .order('name')

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF5' }}>
      <BlogHeader />
      <BlogListing
        posts={(posts || []) as any}
        categories={(categories || []) as any}
        selectedCategory={selectedCategory}
      />
    </div>
  )
}
