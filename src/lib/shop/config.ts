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
