'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ColoringCanvas } from '@/components/coloring/coloring-canvas'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ColorPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadImage()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadImage = async () => {
    try {
      // First try ai_generations table
      const { data: generation } = await supabase
        .from('ai_generations')
        .select('id, result_url, prompt')
        .eq('id', id)
        .single() as { data: { id: string; result_url: string | null; prompt: string } | null }

      if (generation?.result_url) {
        setImageUrl(generation.result_url)
        setTitle(generation.prompt || 'AI Generated')
        setIsLoading(false)
        return
      }

      // Then try coloring_pages table
      const { data: page } = await supabase
        .from('coloring_pages')
        .select('id, full_url, title')
        .eq('id', id)
        .single() as { data: { id: string; full_url: string; title: string } | null }

      if (page?.full_url) {
        setImageUrl(page.full_url)
        setTitle(page.title)
        setIsLoading(false)
        return
      }

      // Then try reference_images table
      const { data: ref } = await supabase
        .from('reference_images')
        .select('id, image_url, edition, page_number')
        .eq('id', id)
        .single() as { data: { id: string; image_url: string; edition: string; page_number: number } | null }

      if (ref?.image_url) {
        setImageUrl(ref.image_url)
        setTitle(`${ref.edition} Edition - Page ${ref.page_number}`)
        setIsLoading(false)
        return
      }

      // If none found, check if it's a direct URL passed as query param
      toast.error('Image not found')
      router.back()
    } catch {
      toast.error('Failed to load image')
      router.back()
    }
  }

  const handleSave = async (canvasDataUrl: string) => {
    setIsSaving(true)
    try {
      // Convert data URL to blob
      const response = await fetch(canvasDataUrl)
      const blob = await response.blob()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in to save')
        return
      }

      const fileName = `${user.id}/${id}-${Date.now()}.png`

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, blob, { contentType: 'image/png' })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName)

      toast.success('Saved! You can share it as a post.', {
        action: {
          label: 'Share',
          onClick: () => router.push(`/create?image=${encodeURIComponent(publicUrl)}`),
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Image not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Compact Header */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-3 py-2 flex items-center gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-xl h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-medium truncate flex-1">{title}</h1>
        {isSaving && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </div>
        )}
      </header>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ColoringCanvas imageUrl={imageUrl} onSave={handleSave} />
      </div>
    </div>
  )
}
