import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { WishlistContent } from '@/components/reading/wishlist-content'

export const metadata = {
  title: 'Wishlist | Relaks',
  description: 'Books you want to read',
}

export default function WishlistPage() {
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
                Wishlist
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Books you want to read
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <WishlistContent />
      </div>
    </div>
  )
}
