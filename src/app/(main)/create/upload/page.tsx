'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImagePicker } from '@/components/upload/image-picker'
import { UploadForm } from '@/components/upload/upload-form'
import { fileToDataUrl } from '@/lib/upload'

export default function UploadPage() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (selectedFile) {
      fileToDataUrl(selectedFile).then(setPreviewUrl)
    }
  }, [selectedFile])

  const handleImageSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">
            {selectedFile ? 'New Post' : 'Upload Artwork'}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {!selectedFile ? (
          <ImagePicker onImageSelect={handleImageSelect} />
        ) : (
          previewUrl && (
            <UploadForm
              file={selectedFile}
              previewUrl={previewUrl}
              onCancel={handleCancel}
            />
          )
        )}
      </main>
    </div>
  )
}
