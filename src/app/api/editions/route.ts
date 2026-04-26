import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Fallback editions if migration hasn't been run yet
const FALLBACK_EDITIONS = [
  { id: null, slug: 'lavender', display_name: 'Lavender Edition', description: null, color: '#8b5cf6', gradient_from: 'from-purple-500', gradient_to: 'to-violet-600', gradient_bg: 'bg-purple-50 dark:bg-purple-950/30', cover_image_url: null, is_active: true, display_order: 0 },
  { id: null, slug: 'pink', display_name: 'Pink Edition', description: null, color: '#ec4899', gradient_from: 'from-pink-500', gradient_to: 'to-rose-500', gradient_bg: 'bg-pink-50 dark:bg-pink-950/30', cover_image_url: null, is_active: true, display_order: 1 },
  { id: null, slug: 'christmas', display_name: 'Christmas Edition', description: null, color: '#ef4444', gradient_from: 'from-red-500', gradient_to: 'to-green-600', gradient_bg: 'bg-red-50 dark:bg-red-950/30', cover_image_url: null, is_active: true, display_order: 2 },
]

export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('editions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error || !data || data.length === 0) {
      // Table doesn't exist yet or is empty — return fallbacks
      return NextResponse.json({ editions: FALLBACK_EDITIONS })
    }

    return NextResponse.json({ editions: data })
  } catch {
    return NextResponse.json({ editions: FALLBACK_EDITIONS })
  }
}
