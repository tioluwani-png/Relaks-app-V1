import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ edition: string; page: string }> }
) {
  const { edition, page } = await params
  const supabase = await createClient()

  try {
    const pageNumber = parseInt(page)

    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
    }

    // Fetch official references for this page
    const { data: official, error: officialError } = await supabase
      .from('reference_images')
      .select('id, image_url, is_official, created_at')
      .eq('edition', edition)
      .eq('page_number', pageNumber)
      .eq('is_official', true)
      .order('created_at', { ascending: false })

    if (officialError) {
      throw officialError
    }

    // Fetch community references for this page
    const { data: community, error: communityError } = await supabase
      .from('reference_images')
      .select('id, image_url, is_official, created_at')
      .eq('edition', edition)
      .eq('page_number', pageNumber)
      .eq('is_official', false)
      .order('created_at', { ascending: false })

    if (communityError) {
      throw communityError
    }

    return NextResponse.json({
      official: official || [],
      community: community || [],
    })
  } catch (error) {
    console.error('Error fetching page references:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
