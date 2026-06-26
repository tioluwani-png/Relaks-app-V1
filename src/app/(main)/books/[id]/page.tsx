import { BookDetail } from '@/components/books/book-detail'
import { BookReviews } from '@/components/books/book-reviews'
import { BookComments } from '@/components/books/book-comments'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface BookPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('books')
    .select('title, author, description')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  const book = data as { title: string; author: string; description: string | null } | null

  if (!book) {
    return {
      title: 'Book Not Found | Relaks',
    }
  }

  return {
    title: `${book.title} by ${book.author} | Relaks`,
    description: book.description || `Read ${book.title} by ${book.author} on Relaks Reading Club`,
  }
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    notFound()
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <BookDetail bookId={id} />

        {/* Reviews Section */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6">
          <BookReviews bookId={id} currentUserId={user?.id} />
        </div>

        {/* Comments Section */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6">
          <BookComments bookId={id} />
        </div>
      </div>
    </div>
  )
}
