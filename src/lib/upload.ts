import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB absolute max

export interface UploadOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
}

/**
 * Validate a file is a genuine image by checking magic bytes.
 */
export async function validateImageFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' }
  }

  // Validate magic bytes (first 12 bytes)
  const buffer = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  const isValid =
    // JPEG: FF D8 FF
    (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) ||
    // PNG: 89 50 4E 47
    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) ||
    // GIF: 47 49 46 38
    (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) ||
    // WebP: 52 49 46 46 ... 57 45 42 50
    (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)

  if (!isValid) {
    return { valid: false, error: 'File does not appear to be a valid image.' }
  }

  return { valid: true }
}

function getSafeExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[mimeType] || 'jpg'
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
  // Validate file before uploading
  const validation = await validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Generate safe filename from MIME type (never use user's filename)
  const timestamp = Date.now()
  const extension = getSafeExtension(file.type)
  const randomId = Math.random().toString(36).substring(2, 9)
  const filename = `${userId}/${timestamp}-${randomId}.${extension}`
  const thumbnailFilename = `${userId}/${timestamp}-${randomId}_thumb.${extension}`

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
  // Validate file before uploading
  const validation = await validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const extension = getSafeExtension(file.type)
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

export async function uploadBookCover(file: File, bookId?: string): Promise<string> {
  // Validate file before uploading
  const validation = await validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const extension = getSafeExtension(file.type)
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 9)
  const filename = bookId
    ? `${bookId}/cover.${extension}`
    : `${timestamp}-${randomId}.${extension}`

  // Compress for book covers - good quality but reasonable size
  const compressed = await compressImage(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 800,
  })

  // If updating existing book, try to delete old cover first
  if (bookId) {
    const supabase = createClient()
    await supabase.storage.from('book-covers').remove([filename]).catch(() => {
      // Ignore errors if file doesn't exist
    })
  }

  return uploadToSupabase(compressed, 'book-covers', filename)
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
