'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, ChevronRight, Sparkles, ShoppingBag, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TopPage {
  page_number: number
  edition: string
  image_url: string | null
}

interface Edition {
  id: string
  display_name: string
  slug: string
  cover_image_url?: string
  price_naira?: number
}

interface NewsLine {
  type: string
  text: string
  link?: string
}

interface YourEditionData {
  hasEdition: boolean
  edition?: {
    id: string
    display_name: string
    slug: string
  }
  topPages?: TopPage[]
  newsLine?: NewsLine | null
  editions?: Edition[]
  lowestPrice?: number | null
}

const DISMISS_KEY = 'relaks_edition_card_dismissed'

function getDismissedToday(): boolean {
  try {
    const stored = localStorage.getItem(DISMISS_KEY)
    if (!stored) return false
    const date = new Date(stored)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  } catch {
    return false
  }
}

function setDismissedToday() {
  try {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString())
  } catch {
    // Ignore storage errors
  }
}

export function YourEditionCard() {
  const [data, setData] = useState<YourEditionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (getDismissedToday()) {
      setIsDismissed(true)
      setIsLoading(false)
      return
    }

    fetch('/api/feed/your-edition')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const handleDismiss = () => {
    setDismissedToday()
    setIsDismissed(true)
  }

  if (isLoading || isDismissed || !data) return null

  // User has no edition - show "Get your first book"
  if (!data.hasEdition) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl p-4 mb-4"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            Get your first Relaks book
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {data.editions?.slice(0, 4).map((edition) => (
            <Link
              key={edition.id}
              href={`/books/${edition.slug || edition.id}`}
              className="flex-shrink-0 w-20"
            >
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted mb-1.5">
                {edition.cover_image_url && (
                  <Image
                    src={edition.cover_image_url}
                    alt={edition.display_name}
                    width={80}
                    height={107}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-xs font-medium truncate">{edition.display_name}</p>
            </Link>
          ))}
        </div>

        {data.lowestPrice && (
          <p className="text-xs text-muted-foreground mt-2">
            Starting from ₦{data.lowestPrice.toLocaleString()}
          </p>
        )}
      </motion.div>
    )
  }

  // User has edition - show top pages
  if (!data.topPages || data.topPages.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl p-4 mb-4"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-black/20 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex items-center justify-between mb-3 pr-8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Your edition</span>
          {data.edition && (
            <span className="text-xs text-muted-foreground">
              {data.edition.display_name}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">Most loved this week</p>

      <div className="flex gap-2">
        {data.topPages.map((page) => (
          <Link
            key={page.page_number}
            href={`/references/${page.edition}/${page.page_number}`}
            className="flex-1 aspect-square rounded-xl overflow-hidden bg-muted relative group"
          >
            {page.image_url ? (
              <Image
                src={page.image_url}
                alt={`Page ${page.page_number}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">
                  {page.page_number}
                </span>
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
              p.{page.page_number}
            </div>
          </Link>
        ))}
      </div>

      {/* News line */}
      <AnimatePresence>
        {data.newsLine && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-purple-200/50 dark:border-purple-800/50"
          >
            <Link
              href={data.newsLine.link || '#'}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {data.newsLine.type === 'sale' && (
                  <ShoppingBag className="h-4 w-4 text-pink-500" />
                )}
                {data.newsLine.type === 'rental' && (
                  <BookOpen className="h-4 w-4 text-purple-500" />
                )}
                <span>{data.newsLine.text}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
