import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface EditionRow {
  slug: string
  display_name: string
  color: string
  gradient_from: string
  gradient_to: string
  gradient_bg: string
}

// Fallback editions if the editions table hasn't been created yet
const FALLBACK_EDITIONS: EditionRow[] = [
  { slug: 'lavender', display_name: 'Lavender Edition', color: '#8b5cf6', gradient_from: 'from-purple-500', gradient_to: 'to-violet-600', gradient_bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { slug: 'pink', display_name: 'Pink Edition', color: '#ec4899', gradient_from: 'from-pink-500', gradient_to: 'to-rose-500', gradient_bg: 'bg-pink-50 dark:bg-pink-950/30' },
  { slug: 'christmas', display_name: 'Christmas Edition', color: '#ef4444', gradient_from: 'from-red-500', gradient_to: 'to-green-600', gradient_bg: 'bg-red-50 dark:bg-red-950/30' },
]

export async function GET() {
  const supabase = await createClient()

  try {
    // Try to fetch from editions table, fall back to hardcoded if table doesn't exist
    let editions: EditionRow[] = FALLBACK_EDITIONS

    const { data, error: editionsError } = await supabase
      .from('editions')
      .select('slug, display_name, color, gradient_from, gradient_to, gradient_bg')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (!editionsError && data && data.length > 0) {
      editions = data as EditionRow[]
    }

    // For each edition, count distinct page numbers
    const editionsWithCounts = await Promise.all(
      editions.map(async (edition) => {
        const { data: refs } = await supabase
          .from('reference_images')
          .select('page_number')
          .eq('edition', edition.slug)
          .eq('is_official', true)

        type RefPage = { page_number: number }
        const refsArray = (refs || []) as RefPage[]

        return {
          id: edition.slug,
          name: edition.display_name,
          pageCount: new Set(refsArray.map(r => r.page_number)).size,
          color: edition.color,
          gradient_from: edition.gradient_from,
          gradient_to: edition.gradient_to,
          gradient_bg: edition.gradient_bg,
        }
      })
    )

    return NextResponse.json({ editions: editionsWithCounts })
  } catch (error) {
    console.error('Error fetching references:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
