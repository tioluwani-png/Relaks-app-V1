import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReadingHistoryContent } from '@/components/reading/reading-history-content'

export const metadata = {
  title: 'Reading History | Relaks',
  description: 'Your reading history and progress',
}

export default function ReadingHistoryPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/reading"
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Reading History
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track your reading progress
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ReadingHistoryContent />
      </div>
    </div>
  )
}
