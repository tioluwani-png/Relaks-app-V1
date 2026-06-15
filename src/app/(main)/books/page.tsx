import { BookCatalog } from '@/components/books/book-catalog'

export const metadata = {
  title: 'Books | Relaks',
  description: 'Discover and track your reading journey with our curated book catalog',
}

export default function BooksPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reading Club
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Discover your next favorite read
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <BookCatalog />
      </div>
    </div>
  )
}
