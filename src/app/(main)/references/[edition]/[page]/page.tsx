'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, ZoomIn, X, Paintbrush } from 'lucide-react'
import Link from 'next/link'

interface ReferenceImage {
  id: string
  image_url: string
  is_official: boolean
  created_at: string
}

export default function PageReferencesPage() {
  const params = useParams()
  const router = useRouter()
  const edition = params.edition as string
  const pageNumber = params.page as string
  const [references, setReferences] = useState<{
    official: ReferenceImage[]
    community: ReferenceImage[]
  }>({ official: [], community: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const editionNames: Record<string, string> = { lavender: 'Lavender', pink: 'Pink', christmas: 'Christmas' }
  const editionName = editionNames[edition] || edition.charAt(0).toUpperCase() + edition.slice(1)

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const response = await fetch(`/api/references/${edition}/${pageNumber}`)
        const data = await response.json()
        if (response.ok) {
          setReferences(data)
        }
      } catch {
        console.error('Failed to fetch references')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReferences()
  }, [edition, pageNumber])

  const allReferences = [...references.official, ...references.community]
  const hasReferences = allReferences.length > 0

  return (
    <>
      <Header
        title={`${editionName} - Page ${pageNumber}`}
        showBack
        showSearch={false}
        showNotifications={false}
      />
      <main className="max-w-lg mx-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-16 w-16 rounded" />
              <Skeleton className="h-16 w-16 rounded" />
              <Skeleton className="h-16 w-16 rounded" />
            </div>
          </div>
        ) : !hasReferences ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No references available yet for this page.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All ({allReferences.length})
              </TabsTrigger>
              <TabsTrigger value="official" className="flex-1">
                Official ({references.official.length})
              </TabsTrigger>
              <TabsTrigger value="community" className="flex-1">
                Community ({references.community.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <ReferenceGrid
                references={allReferences}
                onImageClick={setSelectedImage}
              />
            </TabsContent>

            <TabsContent value="official" className="space-y-4">
              {references.official.length > 0 ? (
                <ReferenceGrid
                  references={references.official}
                  onImageClick={setSelectedImage}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No official references yet
                </p>
              )}
            </TabsContent>

            <TabsContent value="community" className="space-y-4">
              {references.community.length > 0 ? (
                <ReferenceGrid
                  references={references.community}
                  onImageClick={setSelectedImage}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No community references yet
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Page Navigation */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => router.push(`/references/${edition}/${parseInt(pageNumber) - 1}`)}
            disabled={parseInt(pageNumber) <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pageNumber}
          </span>
          <Button
            variant="outline"
            onClick={() => router.push(`/references/${edition}/${parseInt(pageNumber) + 1}`)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="relative w-full max-w-2xl aspect-square">
            <Image
              src={selectedImage}
              alt="Reference"
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}

function ReferenceGrid({
  references,
  onImageClick
}: {
  references: ReferenceImage[]
  onImageClick: (url: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {references.map((ref) => (
        <div
          key={ref.id}
          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => onImageClick(ref.image_url)}
        >
          <Image
            src={ref.image_url}
            alt="Color reference"
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <Link
            href={`/color/${ref.id}`}
            className="absolute bottom-2 right-2 p-2 bg-purple-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-600 z-10"
            onClick={(e) => e.stopPropagation()}
            title="Color this image"
          >
            <Paintbrush className="h-4 w-4" />
          </Link>
          {ref.is_official && (
            <Badge className="absolute top-2 left-2" variant="secondary">
              Official
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}
