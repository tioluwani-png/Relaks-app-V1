'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface PageRef {
  pageNumber: number
  official: Array<{
    id: string
    image_url: string
  }>
  community: Array<{
    id: string
    image_url: string
  }>
}

export default function EditionReferencesPage() {
  const params = useParams()
  const router = useRouter()
  const edition = params.edition as string
  const [pages, setPages] = useState<PageRef[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const editionNames: Record<string, string> = { lavender: 'Lavender Edition', pink: 'Pink Edition', christmas: 'Christmas Edition' }
  const editionName = editionNames[edition] || `${edition.charAt(0).toUpperCase() + edition.slice(1)} Edition`

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch(`/api/references/${edition}`)
        const data = await response.json()
        if (response.ok) {
          setPages(data.pages)
        }
      } catch {
        console.error('Failed to fetch pages')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [edition])

  return (
    <>
      <Header title={editionName} showBack showSearch={false} showNotifications={false} />
      <main className="max-w-lg mx-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No references available yet for this edition.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">
              Select a page to view color references
            </p>
            <div className="grid grid-cols-3 gap-2">
              {pages.map((page) => (
                <Link
                  key={page.pageNumber}
                  href={`/discover/references/${edition}/${page.pageNumber}`}
                  className="relative aspect-square bg-muted rounded-lg overflow-hidden group"
                >
                  {page.official[0] ? (
                    <Image
                      src={page.official[0].image_url}
                      alt={`Page ${page.pageNumber}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-muted-foreground">
                        {page.pageNumber}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-semibold">
                      Page {page.pageNumber}
                    </span>
                  </div>
                  {page.community.length > 0 && (
                    <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                      +{page.community.length}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
