'use client'

import Link from 'next/link'
import { BookMarked, History, ListTree, ChevronRight, BookPlus, Library, Heart, BookOpen } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { motion } from 'framer-motion'

const sections = [
  {
    href: '/books',
    icon: Library,
    title: 'Browse Books',
    description: 'Discover new books to read',
    color: 'from-purple-500 to-violet-600',
  },
  {
    href: '/reading/wishlist',
    icon: Heart,
    title: 'Wishlist',
    description: 'Books you want to read',
    color: 'from-pink-500 to-rose-500',
  },
  {
    href: '/reading/lists',
    icon: ListTree,
    title: 'Reading Lists',
    description: 'Curated collections',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    href: '/reading/requests',
    icon: BookPlus,
    title: 'Book Requests',
    description: 'Request and vote for new books',
    color: 'from-amber-500 to-orange-600',
  },
  {
    href: '/reading/history',
    icon: History,
    title: 'Reading History',
    description: 'Books you\'ve read',
    color: 'from-emerald-500 to-teal-600',
  },
]

export default function ReadingPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Reading" />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Reading Club Banner */}
        <Link href="/rent">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-5 text-white"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <BookMarked className="h-5 w-5" />
                <span className="text-sm font-medium opacity-90">Reading Club</span>
              </div>
              <h2 className="text-xl font-bold mb-1">Rent physical books</h2>
              <p className="text-sm opacity-80">Delivered to your door, return when done</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <BookOpen className="h-32 w-32" />
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-60" />
          </motion.div>
        </Link>

        {/* My Rentals */}
        <Link href="/rent/my-rentals">
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">My Rentals</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track your borrowed books</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Link>

        {/* Section Links */}
        <div className="space-y-3">
          {sections.map((section, index) => {
            const Icon = section.icon
            return (
              <motion.div
                key={section.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={section.href}>
                  <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
