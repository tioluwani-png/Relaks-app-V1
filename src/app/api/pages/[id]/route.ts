import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: page, error } = await supabase
      .from('coloring_pages')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const pageData = page as { is_free: boolean; full_url: string; [key: string]: unknown }

    // Check if user has purchased
    const { data: { user } } = await supabase.auth.getUser()
    let is_purchased = pageData.is_free

    if (user && !is_purchased) {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_id', id)
        .single()

      is_purchased = !!purchase

      // Check for unlimited subscription
      if (!is_purchased) {
        const { data: unlimitedPurchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'unlimited')
          .single()

        is_purchased = !!unlimitedPurchase
      }
    }

    return NextResponse.json({
      page: {
        ...pageData,
        is_purchased,
        // Only return full URL if purchased
        full_url: is_purchased ? pageData.full_url : null,
      },
    })
  } catch (error) {
    console.error('Error fetching page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
