import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    // Get unique editions with their page counts
    const { data: lavender } = await supabase
      .from('reference_images')
      .select('page_number')
      .eq('edition', 'lavender')
      .eq('is_official', true)

    const { data: pink } = await supabase
      .from('reference_images')
      .select('page_number')
      .eq('edition', 'pink')
      .eq('is_official', true)

    type RefPage = { page_number: number }
    const lavenderArray = (lavender || []) as RefPage[]
    const pinkArray = (pink || []) as RefPage[]

    const editions = [
      {
        id: 'lavender',
        name: 'Lavender Edition',
        pageCount: new Set(lavenderArray.map(r => r.page_number)).size,
        color: '#E6E6FA',
      },
      {
        id: 'pink',
        name: 'Pink Edition',
        pageCount: new Set(pinkArray.map(r => r.page_number)).size,
        color: '#FFB6C1',
      },
    ]

    return NextResponse.json({ editions })
  } catch (error) {
    console.error('Error fetching references:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
