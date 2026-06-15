import { BookRequestsList } from '@/components/requests/book-requests-list'

export const metadata = {
  title: 'Book Requests | Relaks',
  description: 'Request and vote for books you want to see in the Relaks Reading Club',
}

export default function RequestsPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Book Requests
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Help us grow our collection
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BookRequestsList />
      </div>
    </div>
  )
}
