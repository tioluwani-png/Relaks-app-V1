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

// Distributors outside Lagos
// TODO: Replace placeholder numbers with real distributor contacts
export const DISTRIBUTORS = [
  {
    city: 'Kano',
    name: 'TBD Distributor',
    phone: '2348000000001', // TODO: Real number
    whatsappMessage: 'Hi, I want to buy Relaks products in Kano',
  },
  {
    city: 'Abuja',
    name: 'TBD Distributor',
    phone: '2348000000002', // TODO: Real number
    whatsappMessage: 'Hi, I want to buy Relaks products in Abuja',
  },
  {
    city: 'Port Harcourt',
    name: 'TBD Distributor',
    phone: '2348000000003', // TODO: Real number
    whatsappMessage: 'Hi, I want to buy Relaks products in Port Harcourt',
  },
  {
    city: 'Ibadan',
    name: 'TBD Distributor',
    phone: '2348000000004', // TODO: Real number
    whatsappMessage: 'Hi, I want to buy Relaks products in Ibadan',
  },
] as const

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
