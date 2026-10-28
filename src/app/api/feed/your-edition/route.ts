import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ hasEdition: false })
    }

    // Get user's editions
    const { data: profile } = await supabase
      .from('users')
      .select('editions_owned')
      .eq('id', user.id)
      .single()

    const editionsOwned = (profile as { editions_owned: string[] } | null)?.editions_owned || []

    if (editionsOwned.length === 0) {
      // Get editions with lowest price for "Get your first book" card
      const { data: editionsData } = await adminClient
        .from('editions')
        .select('id, display_name, slug, cover_image_url, price_naira')
        .eq('is_active', true)
        .order('price_naira', { ascending: true })
        .limit(4)

      const editions = editionsData as { id: string; display_name: string; slug: string; cover_image_url: string; price_naira: number }[] | null
      const lowestPrice = editions && editions.length > 0 ? editions[0].price_naira : null

      return NextResponse.json({
        hasEdition: false,
        editions: editions || [],
        lowestPrice,
      })
    }

    // User has edition(s) - get most-liked pages from their first edition this week
    const primaryEdition = editionsOwned[0]
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Get posts from this edition with likes this week, grouped by page
    const { data: topPages } = await adminClient
      .from('posts')
      .select('page_number, edition')
      .eq('edition', primaryEdition)
      .not('page_number', 'is', null)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('like_count', { ascending: false })
      .limit(20)

    // Deduplicate by page_number and take top 4
    const seenPages = new Set<number>()
    const uniqueTopPages: { page_number: number; edition: string }[] = []
    for (const post of (topPages || []) as { page_number: number; edition: string }[]) {
      if (!seenPages.has(post.page_number) && uniqueTopPages.length < 4) {
        seenPages.add(post.page_number)
        uniqueTopPages.push(post)
      }
    }

    // Get reference images for these pages
    const pageNumbers = uniqueTopPages.map(p => p.page_number)
    let referenceImages: { page_number: number; image_url: string }[] = []

    if (pageNumbers.length > 0) {
      const { data: refs } = await adminClient
        .from('reference_images')
        .select('page_number, image_url')
        .eq('edition', primaryEdition)
        .in('page_number', pageNumbers)
        .eq('is_official', true)

      referenceImages = (refs || []) as { page_number: number; image_url: string }[]
    }

    // Map reference images to pages
    const pageImageMap = new Map(referenceImages.map(r => [r.page_number, r.image_url]))
    const topPagesWithImages = uniqueTopPages.map(p => ({
      page_number: p.page_number,
      edition: p.edition,
      image_url: pageImageMap.get(p.page_number) || null,
    }))

    // Get edition display name
    const { data: editionData } = await adminClient
      .from('editions')
      .select('display_name, slug')
      .eq('id', primaryEdition)
      .single()

    // Check for news (sale, new edition, rental status)
    let newsLine: { type: string; text: string; link?: string } | null = null

    // Check for active sale
    const now = new Date().toISOString()
    const { data: saleData } = await adminClient
      .from('shop_sales')
      .select('name, discount_percent')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .limit(1)
      .single()

    const sale = saleData as { name: string; discount_percent: number } | null
    if (sale) {
      newsLine = {
        type: 'sale',
        text: `${sale.discount_percent}% off in the shop`,
        link: '/shop',
      }
    }

    // Check user's rental status if no sale
    if (!newsLine) {
      const { data: rental } = await supabase
        .from('rental_subscriptions')
        .select('status, delivery_date, return_by_date')
        .eq('user_id', user.id)
        .in('status', ['delivered', 'awaiting_return'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (rental) {
        const rentalData = rental as { status: string; return_by_date: string | null }
        if (rentalData.status === 'delivered' && rentalData.return_by_date) {
          const returnDate = new Date(rentalData.return_by_date)
          const daysLeft = Math.ceil((returnDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysLeft <= 7 && daysLeft > 0) {
            newsLine = {
              type: 'rental',
              text: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on your rental`,
              link: '/rent/my-rentals',
            }
          }
        }
      }
    }

    return NextResponse.json({
      hasEdition: true,
      edition: editionData ? {
        id: primaryEdition,
        display_name: (editionData as { display_name: string }).display_name,
        slug: (editionData as { slug: string }).slug,
      } : null,
      topPages: topPagesWithImages,
      newsLine,
    })
  } catch (error) {
    console.error('[feed/your-edition] Error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
