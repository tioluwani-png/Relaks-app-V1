import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListDetail } from '@/components/reading/list-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: list } = await supabase
    .from('reading_lists')
    .select('title, description, is_public')
    .eq('id', id)
    .single()

  if (!list || !list.is_public) {
    return {
      title: 'Reading List | Relaks',
    }
  }

  return {
    title: `${list.title} | Reading Lists | Relaks`,
    description: list.description || `Check out this reading list on Relaks`,
  }
}

export default async function ReadingListPage({ params }: PageProps) {
  const { id } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/reading/lists"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Lists</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ListDetail listId={id} currentUserId={user?.id} />
      </div>
    </div>
  )
}
