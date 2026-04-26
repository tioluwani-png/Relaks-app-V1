'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, X, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { uploadPostImage } from '@/lib/upload'
import { useAuth } from '@/hooks/use-auth'
import { useEditions } from '@/hooks/use-editions'
import { FadeIn } from '@/components/shared/motion'

interface UploadFormProps {
  file: File
  previewUrl: string
  onCancel: () => void
}

export function UploadForm({ file, previewUrl, onCancel }: UploadFormProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const { editions } = useEditions()
  const [isUploading, setIsUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [edition, setEdition] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [rotation, setRotation] = useState(0)

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile) {
      toast.error('Please log in to upload')
      return
    }

    setIsUploading(true)

    try {
      // Upload image to Supabase Storage
      const { imageUrl, thumbnailUrl } = await uploadPostImage(file, profile.id)

      // Create post in database
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          caption: caption.trim() || null,
          edition: edition || null,
          page_number: pageNumber ? parseInt(pageNumber) : null,
          is_public: isPublic,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post')
      }

      toast.success('Post uploaded successfully!')
      router.push(`/post/${data.post.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <FadeIn>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Preview */}
        <div className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-4">
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-contain"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={handleRotate}
                  className="h-8 w-8 rounded-xl"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={onCancel}
                  className="h-8 w-8 rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <Label htmlFor="caption">Caption (optional)</Label>
          <Textarea
            id="caption"
            placeholder="Share your thoughts about this artwork..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={500}
            rows={3}
            className="rounded-xl focus-visible:ring-purple-500/30"
          />
          <p className="text-xs text-muted-foreground text-right">
            {caption.length}/500
          </p>
        </div>

        {/* Edition and Page Number */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edition">Edition (optional)</Label>
            <Select value={edition} onValueChange={setEdition}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select edition" />
              </SelectTrigger>
              <SelectContent>
                {editions.map((ed) => (
                  <SelectItem key={ed.slug} value={ed.slug}>
                    {ed.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pageNumber">Page # (optional)</Label>
            <Input
              id="pageNumber"
              type="number"
              placeholder="e.g. 15"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              min={1}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
          <div>
            <Label htmlFor="visibility">Public</Label>
            <p className="text-sm text-muted-foreground">
              {isPublic
                ? 'Anyone can see this post'
                : 'Only you can see this post'}
            </p>
          </div>
          <Switch
            id="visibility"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full rounded-xl gradient-purple-pink text-white border-0 h-12 text-base font-semibold"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Share'
          )}
        </Button>
      </form>
    </FadeIn>
  )
}
