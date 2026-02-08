import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's purchases that include pages
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`
        id,
        type,
        created_at,
        page:coloring_pages!purchases_page_id_fkey(
          id,
          title,
          description,
          preview_url,
          full_url,
          category
        )
      `)
      .eq('user_id', user.id)
      .not('page_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if user has unlimited access
    const { data: unlimitedPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'unlimited')
      .single()

    const hasUnlimited = !!unlimitedPurchase

    // If user has unlimited, get all pages
    let allPages: Record<string, unknown>[] = []
    if (hasUnlimited) {
      const { data: pages } = await supabase
        .from('coloring_pages')
        .select('*')
        .order('created_at', { ascending: false })

      allPages = (pages || []) as Record<string, unknown>[]
    }

    // Get user's free pages remaining
    const { data: userData } = await supabase
      .from('users')
      .select('free_pages_remaining')
      .eq('id', user.id)
      .single()

    const userDataTyped = userData as { free_pages_remaining: number } | null

    return NextResponse.json({
      purchases: purchases || [],
      hasUnlimited,
      allPages: hasUnlimited ? allPages : [],
      freePagesRemaining: userDataTyped?.free_pages_remaining || 0,
    })
  } catch (error) {
    console.error('Error fetching downloads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
