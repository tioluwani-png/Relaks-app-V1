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

export async function GET() {
  const supabase = await createClient()

  try {
    // Fetch all active editions
    const { data, error: editionsError } = await supabase
      .from('editions')
      .select('slug, display_name, color, gradient_from, gradient_to, gradient_bg')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (editionsError) {
      return NextResponse.json({ error: editionsError.message }, { status: 500 })
    }

    const editions = (data || []) as EditionRow[]

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
