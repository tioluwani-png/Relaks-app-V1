import 'server-only'
import { unstable_cache } from 'next/cache'
import type { ShopDeliveryZone } from '@/types/database'
import { FALLBACK_EDITION_NAMES } from './content'
import { createLandingClient, ONE_HOUR } from './supabase'

// Round down to the nearest 100 (small counts are shown as-is)
function roundDown(n: number): number {
  return n >= 100 ? Math.floor(n / 100) * 100 : n
}

export interface LandingStats {
  colorists: number
  pages: number
}

/** Colorist and shared-page counts, cached for 1 hour. Null if the database can't be read. */
export const getLandingStats = unstable_cache(
  async (): Promise<LandingStats | null> => {
    try {
      const supabase = createLandingClient()
      const [users, posts] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
      ])

      if (users.error || posts.error || users.count === null || posts.count === null) {
        console.error('[landing/stats] Count error:', users.error ?? posts.error)
        return null
      }

      return { colorists: roundDown(users.count), pages: roundDown(posts.count) }
    } catch (error) {
      console.error('[landing/stats] Exception:', error)
      return null
    }
  },
  ['landing-stats'],
  { revalidate: ONE_HOUR }
)

/** Active edition names without the " Edition" suffix, in display order. */
export const getActiveEditionNames = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const supabase = createLandingClient()
      const { data, error } = await supabase
        .from('editions')
        .select('display_name')
        .eq('is_active', true)
        .order('display_order')

      if (error || !data || data.length === 0) return FALLBACK_EDITION_NAMES

      return (data as { display_name: string }[]).map((e) =>
        e.display_name.trim().replace(/\s+edition$/i, '')
      )
    } catch {
      return FALLBACK_EDITION_NAMES
    }
  },
  ['landing-editions'],
  { revalidate: ONE_HOUR, tags: ['editions'] }
)

export interface DeliveryZoneSummary {
  id: string
  name: string
  fee_naira: number
  min_days: number
  max_days: number
  areas: string[]
}

/** Active Lagos delivery zones with their areas, for the Delivery & Returns page. */
export const getDeliveryZones = unstable_cache(
  async (): Promise<DeliveryZoneSummary[]> => {
    try {
      const supabase = createLandingClient()
      const [{ data: zones, error: zonesError }, { data: areas }] = await Promise.all([
        supabase
          .from('shop_delivery_zones')
          .select('*')
          .eq('is_active', true)
          .eq('is_archived', false)
          .order('sort_order'),
        supabase.from('shop_delivery_areas').select('name, zone_id').order('name'),
      ])

      if (zonesError || !zones) return []

      const areaRows = (areas ?? []) as { name: string; zone_id: string | null }[]
      return (zones as ShopDeliveryZone[]).map((z) => ({
        id: z.id,
        name: z.name,
        fee_naira: z.fee_naira,
        min_days: z.min_days,
        max_days: z.max_days,
        areas: areaRows.filter((a) => a.zone_id === z.id).map((a) => a.name),
      }))
    } catch {
      return []
    }
  },
  ['landing-delivery-zones'],
  { revalidate: ONE_HOUR }
)

/** "Lavender, Pink, Teal and Christmas" */
export function joinNaturally(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}
