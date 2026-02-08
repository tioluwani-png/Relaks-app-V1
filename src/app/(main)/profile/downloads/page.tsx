'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Download, Crown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ColoringPage {
  id: string
  title: string
  description: string | null
  preview_url: string
  full_url: string
  category: string | null
}

interface Purchase {
  id: string
  type: string
  created_at: string
  page: ColoringPage | null
}

export default function DownloadsPage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [allPages, setAllPages] = useState<ColoringPage[]>([])
  const [hasUnlimited, setHasUnlimited] = useState(false)
  const [freePagesRemaining, setFreePagesRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDownloads()
  }, [])

  const fetchDownloads = async () => {
    try {
      const response = await fetch('/api/pages/downloads')
      const data = await response.json()

      if (response.ok) {
        setPurchases(data.purchases)
        setAllPages(data.allPages)
        setHasUnlimited(data.hasUnlimited)
        setFreePagesRemaining(data.freePagesRemaining)
      }
    } catch (error) {
      console.error('Error fetching downloads:', error)
      toast.error('Failed to load downloads')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (page: ColoringPage) => {
    try {
      // Open the full URL in a new tab for download
      window.open(page.full_url, '_blank')
      toast.success('Download started!')
    } catch {
      toast.error('Failed to download')
    }
  }

  // Get unique pages from purchases
  const purchasedPages = purchases
    .filter(p => p.page)
    .map(p => p.page!)
    .filter((page, index, self) =>
      self.findIndex(p => p.id === page.id) === index
    )

  const displayPages = hasUnlimited ? allPages : purchasedPages

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">My Downloads</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Downloaded Pages</p>
            <p className="text-2xl font-bold">{displayPages.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Free Downloads Left</p>
            <p className="text-2xl font-bold">{freePagesRemaining}</p>
          </div>
        </div>

        {hasUnlimited && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20 p-4 mb-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">Unlimited Access</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              You have access to all current and future coloring pages!
            </p>
          </div>
        )}

        {displayPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-1">No downloads yet</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Browse our coloring pages and start downloading!
            </p>
            <Button onClick={() => router.push('/discover/pages')}>
              Browse Pages
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {displayPages.map((page) => (
              <div key={page.id} className="bg-card rounded-lg border overflow-hidden">
                <div className="relative aspect-square">
                  <Image
                    src={page.preview_url}
                    alt={page.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{page.title}</h3>
                  {page.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {page.category}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleDownload(page)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
