'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Download, Sparkles, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface AIGeneration {
  id: string
  prompt: string
  style: string | null
  complexity: string | null
  result_url: string | null
  is_purchased: boolean
  created_at: string
}

export default function CreationsPage() {
  const router = useRouter()
  const [generations, setGenerations] = useState<AIGeneration[]>([])
  const [aiCredits, setAiCredits] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchGenerations()
  }, [])

  const fetchGenerations = async () => {
    try {
      const response = await fetch('/api/ai/generations')
      const data = await response.json()

      if (response.ok) {
        setGenerations(data.generations)
        setAiCredits(data.aiCredits)
      }
    } catch (error) {
      console.error('Error fetching generations:', error)
      toast.error('Failed to load creations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (generation: AIGeneration) => {
    if (!generation.is_purchased) {
      toast.error('Please purchase this generation first')
      return
    }

    if (generation.result_url) {
      window.open(generation.result_url, '_blank')
      toast.success('Download started!')
    }
  }

  const handlePurchase = async () => {
    // This would typically initiate a payment flow
    toast.info('Purchase feature coming soon!')
  }

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
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-4 text-lg font-semibold">My Creations</h1>
          </div>
          <Button size="sm" onClick={() => router.push('/create/generate')}>
            <Sparkles className="h-4 w-4 mr-1" />
            Generate
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Creations</p>
            <p className="text-2xl font-bold">{generations.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">AI Credits</p>
            <p className="text-2xl font-bold">{aiCredits}</p>
          </div>
        </div>

        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-1">No creations yet</h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first AI-generated coloring page!
            </p>
            <Button onClick={() => router.push('/create/generate')}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Page
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {generations.map((generation) => (
              <div key={generation.id} className="bg-card rounded-lg border overflow-hidden">
                <div className="relative aspect-square">
                  {generation.result_url ? (
                    <>
                      <Image
                        src={generation.result_url}
                        alt={generation.prompt}
                        fill
                        className="object-cover"
                      />
                      {!generation.is_purchased && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm line-clamp-2 mb-1">{generation.prompt}</p>
                  <div className="flex items-center gap-1 mb-2">
                    {generation.style && (
                      <Badge variant="secondary" className="text-xs">
                        {generation.style}
                      </Badge>
                    )}
                    {generation.complexity && (
                      <Badge variant="outline" className="text-xs">
                        {generation.complexity}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {formatDistanceToNow(new Date(generation.created_at), { addSuffix: true })}
                  </p>
                  {generation.is_purchased ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleDownload(generation)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handlePurchase()}
                    >
                      Purchase
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
