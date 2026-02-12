import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Downloads an image from a temporary URL (e.g. DALL-E)
 * and uploads it to Supabase Storage for permanent access.
 */
export async function uploadAIImage(
  supabase: SupabaseClient,
  tempUrl: string,
  userId: string
): Promise<string> {
  // Download the image from OpenAI
  const response = await fetch(tempUrl)
  if (!response.ok) {
    throw new Error('Failed to download generated image')
  }

  const blob = await response.blob()
  const fileName = `ai-generations/${userId}/${Date.now()}.png`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(fileName, blob, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to save image: ${uploadError.message}`)
  }

  // Get the permanent public URL
  const { data: { publicUrl } } = supabase.storage
    .from('posts')
    .getPublicUrl(fileName)

  return publicUrl
}
