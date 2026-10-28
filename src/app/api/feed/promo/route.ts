import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const promoTypes: ('product' | 'rental' | 'popular_page')[] = []

    // Randomly choose what type of promo to show
    // Priority: rental status > new product > popular page

    // Check user's rental status
    if (user) {
      const { data: rental } = await supabase
        .from('rental_subscriptions')
        .select('status, return_by_date')
        .eq('user_id', user.id)
        .in('status', ['delivered', 'awaiting_return'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (rental) {
        const rentalData = rental as { status: string; return_by_date: string | null }
        if (rentalData.return_by_date) {
          const returnDate = new Date(rentalData.return_by_date)
          const daysLeft = Math.ceil((returnDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysLeft > 0 && daysLeft <= 14) {
            return NextResponse.json({
              type: 'rental',
              rental: {
                status: rentalData.status,
                days_left: daysLeft,
              },
            })
          }
        }
      }
    }

    // Check for new/seasonal products
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 14)

    const { data: newProducts } = await adminClient
      .from('shop_products')
      .select('id, name, slug, images, price_naira')
      .eq('is_active', true)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    // Also check for Christmas products (if December)
    const currentMonth = new Date().getMonth()
    let seasonalProducts: typeof newProducts = []

    if (currentMonth === 11) { // December
      const { data: christmasProducts } = await adminClient
        .from('shop_products')
        .select('id, name, slug, images, price_naira')
        .eq('is_active', true)
        .or('name.ilike.%christmas%,name.ilike.%holiday%,name.ilike.%festive%')
        .limit(5)

      seasonalProducts = christmasProducts || []
    }

    const allProducts = [...(newProducts || []), ...(seasonalProducts || [])]

    if (allProducts.length > 0) {
      const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)]
      const productData = randomProduct as {
        id: string
        name: string
        slug: string
        images: string[]
        price_naira: number
      }

      return NextResponse.json({
        type: 'product',
        product: {
          id: productData.id,
          name: productData.name,
          slug: productData.slug,
          image_url: productData.images?.[0] || '',
          price_naira: productData.price_naira,
        },
      })
    }

    // Show popular page this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: popularPosts } = await adminClient
      .from('posts')
      .select('edition, page_number')
      .not('page_number', 'is', null)
      .not('edition', 'is', null)
      .gte('created_at', weekAgo.toISOString())

    if (popularPosts && popularPosts.length > 0) {
      // Count posts per page
      const pageCounts = new Map<string, { edition: string; page_number: number; count: number }>()

      for (const post of popularPosts as { edition: string; page_number: number }[]) {
        const key = `${post.edition}-${post.page_number}`
        const existing = pageCounts.get(key)
        if (existing) {
          existing.count++
        } else {
          pageCounts.set(key, {
            edition: post.edition,
            page_number: post.page_number,
            count: 1,
          })
        }
      }

      // Get the most popular page
      let topPage = null
      let maxCount = 0
      for (const page of pageCounts.values()) {
        if (page.count > maxCount) {
          maxCount = page.count
          topPage = page
        }
      }

      if (topPage && topPage.count >= 2) {
        // Get reference image for this page
        const { data: refImage } = await adminClient
          .from('reference_images')
          .select('image_url')
          .eq('edition', topPage.edition)
          .eq('page_number', topPage.page_number)
          .eq('is_official', true)
          .single()

        return NextResponse.json({
          type: 'popular_page',
          popular_page: {
            edition: topPage.edition,
            page_number: topPage.page_number,
            count: topPage.count,
            image_url: (refImage as { image_url: string } | null)?.image_url,
          },
        })
      }
    }

    // No promo to show
    return NextResponse.json({})
  } catch (error) {
    console.error('[feed/promo] Error:', error)
    return NextResponse.json({})
  }
}
