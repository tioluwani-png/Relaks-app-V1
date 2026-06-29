import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Takes an image (from a URL or base64 data URL)
 * and uploads it to Supabase Storage for permanent access.
 */
export async function uploadAIImage(
  supabase: SupabaseClient,
  imageSource: string,
  userId: string
): Promise<string> {
  let imageBlob: Blob

  if (imageSource.startsWith('data:')) {
    // Handle base64 data URL (from gpt-image-1)
    const base64Data = imageSource.split(',')[1]
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    imageBlob = new Blob([bytes], { type: 'image/png' })
  } else {
    // Handle URL (from DALL-E 3)
    const response = await fetch(imageSource)
    if (!response.ok) {
      throw new Error('Failed to download generated image')
    }
    imageBlob = await response.blob()
  }

  const fileName = `ai-generations/${userId}/${Date.now()}.png`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(fileName, imageBlob, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) {
    console.error('[upload-ai-image] Storage error:', uploadError)
    throw new Error('Failed to save image')
  }

  // Get the permanent public URL
  const { data: { publicUrl } } = supabase.storage
    .from('posts')
    .getPublicUrl(fileName)

  return publicUrl
}
