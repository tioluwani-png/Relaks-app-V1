import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ edition: string }> }
) {
  const supabase = await createClient()
  const { edition } = await params

  if (!['lavender', 'pink', 'christmas'].includes(edition)) {
    return NextResponse.json({ error: 'Invalid edition' }, { status: 400 })
  }

  try {
    const { data: references, error } = await supabase
      .from('reference_images')
      .select('*')
      .eq('edition', edition)
      .order('page_number', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type ReferenceType = { page_number: number; is_official: boolean; [key: string]: unknown }
    const referencesArray = (references || []) as ReferenceType[]

    // Group references by page number
    const pages = referencesArray.reduce((acc, ref) => {
      const pageKey = ref.page_number
      if (!acc[pageKey]) {
        acc[pageKey] = {
          pageNumber: pageKey,
          official: [] as ReferenceType[],
          community: [] as ReferenceType[],
        }
      }
      if (ref.is_official) {
        acc[pageKey].official.push(ref)
      } else {
        acc[pageKey].community.push(ref)
      }
      return acc
    }, {} as Record<number, { pageNumber: number; official: ReferenceType[]; community: ReferenceType[] }>)

    return NextResponse.json({
      edition,
      pages: Object.values(pages || {}),
    })
  } catch (error) {
    console.error('Error fetching references:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
