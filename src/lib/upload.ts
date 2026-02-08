import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

export interface UploadOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
}

export async function compressImage(
  file: File,
  options: UploadOptions = {}
): Promise<File> {
  const { maxSizeMB = 1, maxWidthOrHeight = 1920 } = options

  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file
  }

  const compressedFile = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/jpeg',
  })

  return compressedFile
}

export async function uploadToSupabase(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicUrl
}

export async function uploadPostImage(file: File, userId: string): Promise<{
  imageUrl: string
  thumbnailUrl: string
}> {
  // Generate unique filename
  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'jpg'
  const filename = `${userId}/${timestamp}.${extension}`
  const thumbnailFilename = `${userId}/${timestamp}_thumb.${extension}`

  // Compress main image
  const compressedImage = await compressImage(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
  })

  // Create thumbnail
  const thumbnail = await compressImage(file, {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 400,
  })

  // Upload both
  const [imageUrl, thumbnailUrl] = await Promise.all([
    uploadToSupabase(compressedImage, 'posts', filename),
    uploadToSupabase(thumbnail, 'posts', thumbnailFilename),
  ])

  return { imageUrl, thumbnailUrl }
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const extension = file.name.split('.').pop() || 'jpg'
  const filename = `${userId}/avatar.${extension}`

  const compressed = await compressImage(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 500,
  })

  // Delete existing avatar first
  const supabase = createClient()
  await supabase.storage.from('avatars').remove([filename])

  return uploadToSupabase(compressed, 'avatars', filename)
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
