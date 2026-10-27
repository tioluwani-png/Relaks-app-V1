import 'server-only'
import { unstable_cache } from 'next/cache'
import type { RentalPlan, ShopProduct, ShopProductVariant } from '@/types/database'
import { createLandingClient, ONE_HOUR } from './supabase'
import { CHRISTMAS, NON_ADULT_PRODUCT_PATTERN } from './content'

export const LANDING_GALLERY_TAG = 'landing-gallery'

// ============================================
// SHOP
// ============================================

/**
 * Adult coloring books for the hero/door images and "From ₦X" price.
 * Falls back to any book, then any product, so there's always something to show.
 */
export function adultBooks(products: LandingProduct[]): LandingProduct[] {
  const books = products.filter((p) => p.product.product_type === 'book')
  const adult = books.filter((p) => !NON_ADULT_PRODUCT_PATTERN.test(p.product.name))
  if (adult.length > 0) return adult
  return books.length > 0 ? books : products
}

export interface LandingProduct {
  product: ShopProduct
  /** Lowest price across active variants, or the product price */
  price: number
  /** Struck-through price, only when higher than `price` */
  compareAt: number | null
  /** True when variants have different prices ("From ₦X") */
  fromPrice: boolean
  inStock: boolean
  /** Name, edition or a variant option matches CHRISTMAS.productPattern */
  isChristmas: boolean
}

/** Active shop products in shop order, with variant-aware pricing. */
export const getLandingProducts = unstable_cache(
  async (): Promise<LandingProduct[]> => {
    try {
      const supabase = createLandingClient()
      const { data: products, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('created_at', { ascending: false })

      if (error || !products) return []
      const rows = products as ShopProduct[]

      const variantProductIds = rows.filter((p) => p.has_variants).map((p) => p.id)
      let variants: ShopProductVariant[] = []
      if (variantProductIds.length > 0) {
        const { data } = await supabase
          .from('shop_product_variants')
          .select('*')
          .in('product_id', variantProductIds)
          .eq('is_active', true)
        variants = (data ?? []) as ShopProductVariant[]
      }

      return rows.map((product) => {
        const own = variants.filter((v) => v.product_id === product.id)
        const isChristmas = [product.name, product.edition ?? '', ...own.flatMap((v) => Object.values(v.option_values ?? {}))]
          .some((text) => CHRISTMAS.productPattern.test(text))

        if (!product.has_variants || own.length === 0) {
          const compareAt = product.compare_at_price_naira
          return {
            product,
            price: product.price_naira,
            compareAt: compareAt && compareAt > product.price_naira ? compareAt : null,
            fromPrice: false,
            inStock: product.stock_quantity > 0,
            isChristmas,
          }
        }

        const prices = own.map((v) => v.price_naira ?? product.price_naira)
        const price = Math.min(...prices)
        const compareAt = product.compare_at_price_naira
        return {
          product,
          price,
          compareAt: compareAt && compareAt > price ? compareAt : null,
          fromPrice: new Set(prices).size > 1,
          inStock: own.some((v) => v.stock_quantity > 0),
          isChristmas,
        }
      })
    } catch (error) {
      console.error('[landing/data] Products error:', error)
      return []
    }
  },
  ['landing-products'],
  { revalidate: ONE_HOUR }
)

/** Lowest active Lagos delivery fee, or null if none. */
export const getLowestZoneFee = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const supabase = createLandingClient()
      const { data } = await supabase
        .from('shop_delivery_zones')
        .select('fee_naira')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('fee_naira')
        .limit(1)
      return (data as { fee_naira: number }[] | null)?.[0]?.fee_naira ?? null
    } catch {
      return null
    }
  },
  ['landing-lowest-zone-fee'],
  { revalidate: ONE_HOUR }
)

// ============================================
// READING CLUB
// ============================================

export interface LandingClubInfo {
  /** Cheapest active plan, used for wording and the "from" price */
  plan: Pick<RentalPlan, 'name' | 'description' | 'price_naira' | 'swap_frequency'> | null
  newestCoverUrl: string | null
}

export const getLandingClubInfo = unstable_cache(
  async (): Promise<LandingClubInfo> => {
    try {
      const supabase = createLandingClient()
      const [{ data: plans }, { data: books }] = await Promise.all([
        supabase
          .from('rental_plans')
          .select('name, description, price_naira, swap_frequency')
          .eq('is_active', true)
          .order('price_naira')
          .limit(1),
        supabase
          .from('books')
          .select('cover_url')
          .eq('is_active', true)
          .not('cover_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1),
      ])
      return {
        plan: (plans as LandingClubInfo['plan'][] | null)?.[0] ?? null,
        newestCoverUrl: (books as { cover_url: string }[] | null)?.[0]?.cover_url ?? null,
      }
    } catch {
      return { plan: null, newestCoverUrl: null }
    }
  },
  ['landing-club-info'],
  { revalidate: ONE_HOUR }
)

// ============================================
// COMMUNITY
// ============================================

export interface LandingPost {
  id: string
  imageUrl: string
  colorist: string
}

type PostRow = {
  id: string
  image_url: string
  thumbnail_url: string | null
  user: { username: string; display_name: string | null } | null
}

const PUBLIC_POST_SELECT = 'id, image_url, thumbnail_url, user:users!posts_user_id_fkey(username, display_name)'

function toLandingPost(row: PostRow): LandingPost {
  return {
    id: row.id,
    imageUrl: row.image_url,
    colorist: row.user?.display_name?.trim() || row.user?.username || 'A Relaks colorist',
  }
}

/** Newest public, unflagged post, for the app door fallback. */
export const getNewestPost = unstable_cache(
  async (): Promise<LandingPost | null> => {
    try {
      const supabase = createLandingClient()
      const { data } = await supabase
        .from('posts')
        .select(PUBLIC_POST_SELECT)
        .eq('is_public', true)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(1)
      const row = (data as unknown as PostRow[] | null)?.[0]
      return row ? toLandingPost(row) : null
    } catch {
      return null
    }
  },
  ['landing-newest-post'],
  { revalidate: ONE_HOUR }
)

/** Up to 12 featured posts, newest first. Empty until the featured_on_home migration has run. */
export const getFeaturedPosts = unstable_cache(
  async (): Promise<LandingPost[]> => {
    try {
      const supabase = createLandingClient()
      const { data, error } = await supabase
        .from('posts')
        .select(PUBLIC_POST_SELECT)
        .eq('featured_on_home', true)
        .eq('is_public', true)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(12)
      if (error || !data) return []
      return (data as unknown as PostRow[]).map(toLandingPost)
    } catch {
      return []
    }
  },
  ['landing-featured-posts'],
  { revalidate: ONE_HOUR, tags: [LANDING_GALLERY_TAG] }
)

// ============================================
// READING CLUB PLANS
// ============================================

export type LandingPlan = Pick<
  RentalPlan,
  'id' | 'name' | 'description' | 'books_per_cycle' | 'duration_days' | 'price_naira' | 'delivery_included' | 'swap_frequency'
>

export const getRentalPlans = unstable_cache(
  async (): Promise<LandingPlan[]> => {
    try {
      const supabase = createLandingClient()
      const { data, error } = await supabase
        .from('rental_plans')
        .select('id, name, description, books_per_cycle, duration_days, price_naira, delivery_included, swap_frequency')
        .eq('is_active', true)
        .order('sort_order')
      if (error || !data) return []
      return data as LandingPlan[]
    } catch {
      return []
    }
  },
  ['landing-rental-plans'],
  { revalidate: ONE_HOUR }
)

// ============================================
// DISTRIBUTORS
// ============================================

export interface LandingDistributor {
  id: string
  city: string
  name: string
  whatsapp_number: string
}

export const getDistributors = unstable_cache(
  async (): Promise<LandingDistributor[]> => {
    try {
      const supabase = createLandingClient()
      const { data, error } = await supabase
        .from('distributors')
        .select('id, city, name, whatsapp_number')
        .eq('is_active', true)
        .order('sort_order')
      if (error || !data) return []
      return data as LandingDistributor[]
    } catch {
      return []
    }
  },
  ['landing-distributors'],
  { revalidate: ONE_HOUR }
)

// ============================================
// DELIVERY SUMMARY (for the FAQ)
// ============================================

export interface ZoneSummary {
  minFee: number
  maxFee: number
  minDays: number
  maxDays: number
}

export const getZoneSummary = unstable_cache(
  async (): Promise<ZoneSummary | null> => {
    try {
      const supabase = createLandingClient()
      const { data, error } = await supabase
        .from('shop_delivery_zones')
        .select('fee_naira, min_days, max_days')
        .eq('is_active', true)
        .eq('is_archived', false)
      const rows = (data ?? []) as { fee_naira: number; min_days: number; max_days: number }[]
      if (error || rows.length === 0) return null
      return {
        minFee: Math.min(...rows.map((z) => z.fee_naira)),
        maxFee: Math.max(...rows.map((z) => z.fee_naira)),
        minDays: Math.min(...rows.map((z) => z.min_days)),
        maxDays: Math.max(...rows.map((z) => z.max_days)),
      }
    } catch {
      return null
    }
  },
  ['landing-zone-summary'],
  { revalidate: ONE_HOUR }
)

// ============================================
// BLOG
// ============================================

export interface LandingBlogPost {
  slug: string
  title: string
  excerpt: string | null
  coverUrl: string | null
}

export const getLatestBlogPosts = unstable_cache(
  async (): Promise<LandingBlogPost[]> => {
    try {
      const supabase = createLandingClient()
      const { data, error } = await supabase
        .from('blog_posts')
        .select('slug, title, excerpt, cover_image_url')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3)
      if (error || !data) return []
      return (data as { slug: string; title: string; excerpt: string | null; cover_image_url: string | null }[]).map(
        (p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, coverUrl: p.cover_image_url })
      )
    } catch {
      return []
    }
  },
  ['landing-blog-posts'],
  { revalidate: ONE_HOUR }
)
