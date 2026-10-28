'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, BookOpen, Palette, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

type PromoType = 'product' | 'rental' | 'popular_page'

interface PromoData {
  type: PromoType
  product?: {
    id: string
    name: string
    image_url: string
    price_naira: number
    slug: string
  }
  rental?: {
    status: string
    days_left?: number
  }
  popular_page?: {
    edition: string
    page_number: number
    count: number
    image_url?: string
  }
}

// Track shown promos in session to avoid repeats
const shownPromos = new Set<string>()

export function PromoCard({ index }: { index: number }) {
  const [promo, setPromo] = useState<PromoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only show promo every 8 posts
    if (index % 8 !== 7) {
      setIsLoading(false)
      return
    }

    fetch('/api/feed/promo')
      .then(res => res.json())
      .then(data => {
        if (data && data.type) {
          const promoKey = `${data.type}-${data.product?.id || data.popular_page?.page_number || 'rental'}`
          if (!shownPromos.has(promoKey)) {
            shownPromos.add(promoKey)
            setPromo(data)
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [index])

  if (isLoading || !promo) return null

  // Product promo
  if (promo.type === 'product' && promo.product) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-2xl p-4"
      >
        <Link href={`/shop/${promo.product.slug}`} className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0">
            <Image
              src={promo.product.image_url}
              alt={promo.product.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400 text-xs font-medium mb-1">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>New in shop</span>
            </div>
            <p className="font-semibold truncate">{promo.product.name}</p>
            <p className="text-sm text-muted-foreground">
              ₦{promo.product.price_naira.toLocaleString()}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </Link>
      </motion.div>
    )
  }

  // Rental status promo
  if (promo.type === 'rental' && promo.rental) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-2xl p-4"
      >
        <Link href="/rent/my-rentals" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-medium mb-1">
              <span>Your rental</span>
            </div>
            <p className="font-semibold">
              {promo.rental.days_left !== undefined
                ? `${promo.rental.days_left} day${promo.rental.days_left !== 1 ? 's' : ''} left`
                : 'Check your books'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </Link>
      </motion.div>
    )
  }

  // Popular page promo
  if (promo.type === 'popular_page' && promo.popular_page) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-4"
      >
        <Link
          href={`/references/${promo.popular_page.edition}/${promo.popular_page.page_number}`}
          className="flex items-center gap-4"
        >
          {promo.popular_page.image_url ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex-shrink-0">
              <Image
                src={promo.popular_page.image_url}
                alt={`Page ${promo.popular_page.page_number}`}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
              <Palette className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium mb-1">
              <span>Trending page</span>
            </div>
            <p className="font-semibold">
              {promo.popular_page.count} people colored this page this week
            </p>
            <p className="text-xs text-muted-foreground">
              {promo.popular_page.edition} · Page {promo.popular_page.page_number}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </Link>
      </motion.div>
    )
  }

  return null
}
