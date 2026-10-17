/**
 * Shop Configuration
 */

// Product types
export const PRODUCT_TYPES = ['book', 'stationery', 'combo', 'other'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

// Order statuses
export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'dispatched',
  'delivered',
  'cancelled',
] as const
export type ShopOrderStatus = (typeof ORDER_STATUSES)[number]

// Status display labels
export const ORDER_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  pending_payment: 'Awaiting Payment',
  paid: 'Paid',
  processing: 'Processing',
  dispatched: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

// Status colors for admin
export const ORDER_STATUS_COLORS: Record<ShopOrderStatus, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  dispatched: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
}

// Distributor type (loaded from database)
export interface Distributor {
  id: string
  city: string
  name: string
  whatsapp_number: string
  is_active: boolean
  sort_order: number
}

/**
 * Normalize a Nigerian phone number to international format (234XXXXXXXXXX)
 * Accepts: 0903..., +234903..., 234903..., with or without spaces/dashes
 * Returns null if invalid
 */
export function normalizeNigerianPhone(input: string): string | null {
  // Remove all non-digit characters except leading +
  const cleaned = input.replace(/[^\d+]/g, '')

  // Remove leading + if present
  const digits = cleaned.replace(/^\+/, '')

  // Handle different formats
  let normalized: string

  if (digits.startsWith('234') && digits.length === 13) {
    // Already in 234XXXXXXXXXX format
    normalized = digits
  } else if (digits.startsWith('0') && digits.length === 11) {
    // Nigerian local format 0XXXXXXXXXX -> 234XXXXXXXXXX
    normalized = '234' + digits.slice(1)
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    // Just the number without prefix (e.g., 9033662304)
    normalized = '234' + digits
  } else {
    return null
  }

  // Validate it's a Nigerian mobile number (starts with 234 + 7/8/9 + 0/1)
  if (!/^234[789][01]\d{8}$/.test(normalized)) {
    return null
  }

  return normalized
}

/**
 * Generate WhatsApp message for a distributor
 */
export function getDistributorWhatsAppMessage(name: string, city: string): string {
  return `Hi ${name}, I found you on relaks.co and I'd like to order Relaks products in ${city}.`
}

// Generate WhatsApp link
export function getWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// Lagos LGAs (same as rental checkout)
export const LAGOS_LGAS = [
  'Agege',
  'Ajeromi-Ifelodun',
  'Alimosho',
  'Amuwo-Odofin',
  'Apapa',
  'Badagry',
  'Epe',
  'Eti-Osa',
  'Ibeju-Lekki',
  'Ifako-Ijaiye',
  'Ikeja',
  'Ikorodu',
  'Kosofe',
  'Lagos Island',
  'Lagos Mainland',
  'Mushin',
  'Ojo',
  'Oshodi-Isolo',
  'Shomolu',
  'Surulere',
] as const

// Order number generation
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `RLK-${timestamp.slice(-4)}${random}`
}

// ==========================================
// Coupon Configuration
// ==========================================

export type CouponStatus = 'scheduled' | 'active' | 'expired' | 'used_up' | 'inactive'

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  expired: 'Expired',
  used_up: 'Used Up',
  inactive: 'Off',
}

export const COUPON_STATUS_COLORS: Record<CouponStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  used_up: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  inactive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

/**
 * Determine the current status of a coupon
 */
export function getCouponStatus(coupon: {
  is_active: boolean
  starts_at: string
  expires_at: string
  max_uses: number | null
  times_used: number
}): CouponStatus {
  if (!coupon.is_active) return 'inactive'

  const now = new Date()
  const startsAt = new Date(coupon.starts_at)
  const expiresAt = new Date(coupon.expires_at)

  if (now < startsAt) return 'scheduled'
  if (now >= expiresAt) return 'expired'
  if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) return 'used_up'

  return 'active'
}

/**
 * Quick duration presets for coupon expiry
 */
export const COUPON_DURATION_PRESETS = [
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '7 days', hours: 168 },
] as const

/**
 * Calculate discount amount for a coupon and subtotal
 */
export function calculateCouponDiscount(
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  subtotal: number
): number {
  if (discountType === 'percentage') {
    return Math.floor(subtotal * (discountValue / 100))
  }
  // Fixed amount - cap at subtotal to prevent negative
  return Math.min(discountValue, subtotal)
}

/**
 * Format coupon discount for display
 */
export function formatCouponDiscount(
  discountType: 'percentage' | 'fixed',
  discountValue: number
): string {
  if (discountType === 'percentage') {
    return `${discountValue}% off`
  }
  return `₦${discountValue.toLocaleString()} off`
}
