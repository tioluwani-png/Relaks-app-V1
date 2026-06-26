import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RequestsContent } from '@/components/reading/requests-content'

export const metadata = {
  title: 'Book Requests | Relaks',
  description: 'Request books to be added to the Relaks Reading Club catalog',
}

export default function BookRequestsPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href="/reading"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Reading</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Book Requests
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Request books and vote for others to be added
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <RequestsContent />
      </div>
    </div>
  )
}
