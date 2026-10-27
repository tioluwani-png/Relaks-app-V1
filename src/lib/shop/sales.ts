import type { ShopProduct, ShopProductVariant, ShopSale, ShopProductType } from '@/types/database'

/**
 * Check if a sale applies to a product
 */
export function saleAppliesToProduct(sale: ShopSale, product: ShopProduct): boolean {
  if (sale.scope === 'all') return true

  if (sale.scope === 'types' && sale.product_types) {
    return sale.product_types.includes(product.product_type)
  }

  if (sale.scope === 'products' && sale.product_ids) {
    return sale.product_ids.includes(product.id)
  }

  return false
}

/**
 * Calculate sale price, rounded to nearest ₦50
 */
export function calculateSalePrice(originalPrice: number, discountPercent: number): number {
  const discountedPrice = originalPrice * (1 - discountPercent / 100)
  return Math.round(discountedPrice / 50) * 50
}

/**
 * Get the effective price for a product/variant, applying sale if applicable
 */
export function getSalePrice(
  product: ShopProduct,
  variant: ShopProductVariant | null,
  sale: ShopSale | null
): {
  price: number
  originalPrice: number
  salePrice: number | null
  discountPercent: number | null
  isOnSale: boolean
} {
  const basePrice = variant?.price_naira ?? product.price_naira
  const compareAtPrice = variant?.compare_at_price_naira ?? product.compare_at_price_naira

  // Use compare_at_price if it's higher than base price for the struck-through display
  const displayOriginalPrice = compareAtPrice && compareAtPrice > basePrice ? compareAtPrice : basePrice

  // Check if sale applies
  if (sale && saleAppliesToProduct(sale, product)) {
    const salePrice = calculateSalePrice(basePrice, sale.discount_percent)
    return {
      price: salePrice,
      originalPrice: displayOriginalPrice,
      salePrice,
      discountPercent: sale.discount_percent,
      isOnSale: true,
    }
  }

  // No sale
  return {
    price: basePrice,
    originalPrice: displayOriginalPrice,
    salePrice: null,
    discountPercent: null,
    isOnSale: false,
  }
}

/**
 * Calculate savings from sale prices
 */
export function calculateSavings(
  items: Array<{
    product: ShopProduct
    variant: ShopProductVariant | null
    quantity: number
  }>,
  sale: ShopSale | null
): number {
  if (!sale) return 0

  return items.reduce((total, item) => {
    const priceInfo = getSalePrice(item.product, item.variant, sale)
    if (priceInfo.isOnSale) {
      const basePrice = item.variant?.price_naira ?? item.product.price_naira
      const savings = (basePrice - priceInfo.salePrice!) * item.quantity
      return total + savings
    }
    return total
  }, 0)
}

/**
 * Check if a sale is currently live
 */
export function isSaleLive(sale: ShopSale): boolean {
  if (!sale.is_active) return false
  const now = new Date()
  const startsAt = new Date(sale.starts_at)
  const endsAt = new Date(sale.ends_at)
  return now >= startsAt && now < endsAt
}

/**
 * Get sale status
 */
export function getSaleStatus(sale: ShopSale): 'scheduled' | 'live' | 'ended' {
  if (!sale.is_active) return 'ended'
  const now = new Date()
  const startsAt = new Date(sale.starts_at)
  const endsAt = new Date(sale.ends_at)

  if (now < startsAt) return 'scheduled'
  if (now >= endsAt) return 'ended'
  return 'live'
}

/**
 * Format time remaining for countdown
 */
export function formatTimeRemaining(endsAt: string): string {
  const now = new Date()
  const end = new Date(endsAt)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export const SALE_STATUS_LABELS: Record<'scheduled' | 'live' | 'ended', string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  ended: 'Ended',
}

export const SALE_STATUS_COLORS: Record<'scheduled' | 'live' | 'ended', string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  live: 'bg-green-100 text-green-800',
  ended: 'bg-gray-100 text-gray-800',
}

export const SALE_SCOPE_LABELS: Record<ShopSale['scope'], string> = {
  all: 'Whole store',
  types: 'Selected categories',
  products: 'Selected products',
}
