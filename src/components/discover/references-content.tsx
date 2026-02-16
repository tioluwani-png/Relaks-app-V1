'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronRight, Images } from 'lucide-react'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/shared/motion'

interface Edition {
  id: string
  name: string
  pageCount: number
  color: string
}

const editionGradients: Record<string, { from: string; to: string; bg: string }> = {
  lavender: { from: 'from-purple-500', to: 'to-violet-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  pink: { from: 'from-pink-500', to: 'to-rose-500', bg: 'bg-pink-50 dark:bg-pink-950/30' },
  christmas: { from: 'from-red-500', to: 'to-green-600', bg: 'bg-red-50 dark:bg-red-950/30' },
}

export function ReferencesContent() {
  const [editions, setEditions] = useState<Edition[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEditions = async () => {
      try {
        const response = await fetch('/api/references')
        const data = await response.json()
        if (response.ok) {
          setEditions(data.editions)
        }
      } catch {
        console.error('Failed to fetch editions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEditions()
  }, [])

  return (
    <div className="p-4">
      <p className="text-muted-foreground mb-6">
        Find color inspiration for your Relaks coloring books. Browse official references
        and community submissions.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl animate-shimmer" />
          <Skeleton className="h-40 w-full rounded-2xl animate-shimmer" />
        </div>
      ) : (
        <div className="space-y-4">
          {editions.map((edition, index) => {
            const gradient = editionGradients[edition.id] || editionGradients.lavender
            return (
              <FadeIn key={edition.id} delay={index * 0.1}>
                <Link href={`/references/${edition.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    className={`relative rounded-2xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.06)] ${gradient.bg}`}
                  >
                    {/* Gradient strip at top */}
                    <div className={`h-2 bg-gradient-to-r ${gradient.from} ${gradient.to}`} />

                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{edition.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {edition.pageCount > 0
                              ? `${edition.pageCount} pages with references`
                              : 'Coming soon'}
                          </p>
                        </div>
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-r ${gradient.from} ${gradient.to} flex items-center justify-center`}>
                          <Images className="h-6 w-6 text-white" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button variant="outline" size="sm" className="rounded-xl">
                          View References
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </FadeIn>
            )
          })}
        </div>
      )}

      {!isLoading && editions.every(e => e.pageCount === 0) && (
        <div className="text-center py-12 rounded-2xl bg-muted/50 mt-4">
          <div className="h-12 w-12 mx-auto rounded-xl gradient-purple-pink flex items-center justify-center mb-3">
            <Images className="h-6 w-6 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">
            References are coming soon! Check back later.
          </p>
        </div>
      )}
    </div>
  )
}
