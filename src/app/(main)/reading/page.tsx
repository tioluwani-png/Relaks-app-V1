import Link from 'next/link'
import { BookMarked, History, ListTree, ChevronRight } from 'lucide-react'

export const metadata = {
  title: 'My Reading | Relaks',
  description: 'Track your reading journey - wishlist, history, and reading lists',
}

const sections = [
  {
    href: '/reading/wishlist',
    icon: BookMarked,
    title: 'Wishlist',
    description: 'Books you want to read',
    color: 'from-purple-500 to-violet-600',
  },
  {
    href: '/reading/history',
    icon: History,
    title: 'Reading History',
    description: 'Books you\'ve read or are reading',
    color: 'from-pink-500 to-rose-500',
  },
  {
    href: '/reading/lists',
    icon: ListTree,
    title: 'My Lists',
    description: 'Your curated reading lists',
    color: 'from-blue-500 to-indigo-600',
  },
]

export default function ReadingPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Reading
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your reading journey
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Link key={section.href} href={section.href}>
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
