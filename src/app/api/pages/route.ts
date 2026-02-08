import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  try {
    let query = supabase
      .from('coloring_pages')
      .select('*')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: pages, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user's purchased pages
    const { data: { user } } = await supabase.auth.getUser()
    let purchasedIds: string[] = []
    let freeDownloads = 5

    if (user) {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('page_id')
        .eq('user_id', user.id)

      const purchasesTyped = purchases as { page_id: string | null }[] | null
      purchasedIds = purchasesTyped?.map(p => p.page_id).filter(Boolean) as string[] || []

      const { data: userData } = await supabase
        .from('users')
        .select('free_pages_remaining')
        .eq('id', user.id)
        .single()

      const userDataTyped = userData as { free_pages_remaining: number } | null
      freeDownloads = userDataTyped?.free_pages_remaining || 0
    }

    const pagesArray = pages as { id: string; is_free: boolean; [key: string]: unknown }[] | null
    const pagesWithStatus = pagesArray?.map(page => ({
      ...page,
      is_purchased: purchasedIds.includes(page.id) || page.is_free,
    }))

    return NextResponse.json({
      pages: pagesWithStatus,
      freeDownloads,
    })
  } catch (error) {
    console.error('Error fetching pages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
