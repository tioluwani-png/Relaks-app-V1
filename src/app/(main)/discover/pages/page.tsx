'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Lock, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface ColoringPage {
  id: string
  title: string
  preview_url: string
  category: string | null
  is_free: boolean
  price_naira: number
  is_purchased: boolean
}

export default function ColoringPagesPage() {
  const router = useRouter()
  const [pages, setPages] = useState<ColoringPage[]>([])
  const [freeDownloads, setFreeDownloads] = useState(5)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch('/api/pages')
        const data = await response.json()
        if (response.ok) {
          setPages(data.pages)
          setFreeDownloads(data.freeDownloads)
        }
      } catch {
        console.error('Failed to fetch pages')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [])

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">Coloring Pages</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {/* Free Downloads Banner */}
        <div className="bg-primary/10 rounded-lg p-4 mb-6">
          <p className="text-sm">
            <span className="font-semibold">{freeDownloads}</span> free downloads remaining
          </p>
          <p className="text-xs text-muted-foreground">
            First 5 pages are free, then ₦500 each
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No coloring pages available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/discover/pages/${page.id}`}
                className="group relative aspect-[3/4] bg-muted rounded-lg overflow-hidden"
              >
                <Image
                  src={page.preview_url}
                  alt={page.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium truncate">
                    {page.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {page.is_purchased ? (
                      <Badge variant="secondary" className="text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        Owned
                      </Badge>
                    ) : page.is_free ? (
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-white/90 text-black">
                        <Lock className="h-3 w-3 mr-1" />
                        ₦{page.price_naira}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
