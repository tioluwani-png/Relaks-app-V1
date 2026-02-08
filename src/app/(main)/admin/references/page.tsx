'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Upload, Loader2, Plus, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Edition = 'lavender' | 'pink'

export default function AdminReferencesPage() {
  const supabase = createClient()
  const [isUploading, setIsUploading] = useState(false)
  const [edition, setEdition] = useState<Edition>('lavender')
  const [pageNumber, setPageNumber] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
      // Upload image to Supabase Storage
      const fileName = `${edition}-page-${pageNumber}-${Date.now()}.${selectedFile.name.split('.').pop()}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('references')
        .upload(fileName, selectedFile)

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('references')
        .getPublicUrl(fileName)

      // Insert into database
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

      // Reset form
      setSelectedFile(null)
      setPreviewUrl(null)
      setPageNumber('')

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <Header title="Upload References" showBack showSearch={false} showNotifications={false} />
      <main className="max-w-lg mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Reference Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Edition Select */}
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

            {/* Page Number */}
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

            {/* File Upload */}
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

            {/* Upload Button */}
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

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Upload high-quality photos of your colored pages</p>
            <p>• Make sure the page number matches your Relaks book</p>
            <p>• You can upload multiple references for the same page</p>
            <p>• Users will see these as inspiration for their coloring</p>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
