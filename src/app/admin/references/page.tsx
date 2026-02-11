'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Upload, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Edition } from '@/types/database'

interface ReferenceImage {
  id: string
  edition: Edition
  page_number: number
  image_url: string
  is_official: boolean
  created_at: string
}

export default function AdminReferencesPage() {
  const supabase = createClient()
  const [isUploading, setIsUploading] = useState(false)
  const [edition, setEdition] = useState<Edition>('lavender')
  const [pageNumber, setPageNumber] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [references, setReferences] = useState<ReferenceImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadReferences()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadReferences = async () => {
    try {
      const { data, error } = await supabase
        .from('reference_images')
        .select('*')
        .order('edition')
        .order('page_number')

      if (error) throw error
      setReferences((data as ReferenceImage[]) || [])
    } catch (error) {
      console.error('Failed to load references:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !pageNumber) {
      toast.error('Please select a file and enter a page number')
      return
    }

    setIsUploading(true)
    try {
      const fileName = `${edition}-page-${pageNumber}-${Date.now()}.${selectedFile.name.split('.').pop()}`

      const { error: uploadError } = await supabase.storage
        .from('references')
        .upload(fileName, selectedFile)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('references')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase
        .from('reference_images')
        .insert({
          edition,
          page_number: parseInt(pageNumber),
          image_url: publicUrl,
          is_official: true,
        } as never)

      if (dbError) {
        throw new Error(dbError.message)
      }

      toast.success('Reference uploaded successfully!')

      setSelectedFile(null)
      setPreviewUrl(null)
      setPageNumber('')
      loadReferences()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (ref: ReferenceImage) => {
    if (!confirm(`Delete ${ref.edition} edition, page ${ref.page_number}?`)) return

    setDeletingId(ref.id)
    try {
      // Extract the file name from the URL to delete from storage
      const urlParts = ref.image_url.split('/references/')
      const storagePath = urlParts[urlParts.length - 1]

      if (storagePath) {
        await supabase.storage.from('references').remove([storagePath])
      }

      const { error } = await supabase
        .from('reference_images')
        .delete()
        .eq('id', ref.id)

      if (error) throw error

      setReferences(references.filter(r => r.id !== ref.id))
      toast.success('Reference deleted')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete reference')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">References</h1>

      <div className="space-y-6">
        {/* Upload Form */}
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Add New Reference Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Edition</Label>
              <Select value={edition} onValueChange={(v) => setEdition(v as Edition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lavender">Lavender Edition</SelectItem>
                  <SelectItem value="pink">Pink Edition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Page Number</Label>
              <Input
                type="number"
                placeholder="e.g., 1, 2, 3..."
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Reference Image</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {previewUrl ? (
                  <div className="relative">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={300}
                      height={300}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedFile(null)
                        setPreviewUrl(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !pageNumber || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Reference
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Existing References */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Uploaded References ({references.length})
          </h2>

          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : references.length === 0 ? (
            <p className="text-gray-500">No references uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {references.map((ref) => (
                <div key={ref.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
                  <div className="relative aspect-square">
                    <Image
                      src={ref.image_url}
                      alt={`${ref.edition} page ${ref.page_number}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">
                        {ref.edition}
                      </p>
                      <p className="text-xs text-gray-500">Page {ref.page_number}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(ref)}
                      disabled={deletingId === ref.id}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                      title="Delete reference"
                    >
                      {deletingId === ref.id ? (
                        <Loader2 size={16} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={16} className="text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
