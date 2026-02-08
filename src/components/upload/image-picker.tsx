'use client'

import { useRef } from 'react'
import { Camera, Image as ImageIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/shared/motion'

interface ImagePickerProps {
  onImageSelect: (file: File) => void
}

export function ImagePicker({ onImageSelect }: ImagePickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image is too large. Maximum size is 10MB.')
        return
      }

      onImageSelect(file)
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <FadeIn>
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] cursor-pointer overflow-hidden"
          onClick={() => cameraInputRef.current?.click()}
        >
          <div className="flex items-center gap-4 p-5">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Camera className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold">Take Photo</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Use your camera to capture your artwork
              </p>
            </div>
          </div>
        </motion.div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] cursor-pointer overflow-hidden"
          onClick={() => galleryInputRef.current?.click()}
        >
          <div className="flex items-center gap-4 p-5">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold">Choose from Gallery</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upload an existing image from your device
              </p>
            </div>
          </div>
        </motion.div>
      </FadeIn>

      <p className="text-xs text-center text-muted-foreground">
        Supported formats: JPG, PNG &middot; Max size: 10MB
      </p>
    </div>
  )
}
