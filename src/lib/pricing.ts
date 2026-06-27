// Pricing constants (in kobo - 100 kobo = 1 Naira)
export const BOOK_RENTAL_PRICE = 300000 // ₦3,000
export const LAGOS_DELIVERY_FEE = 300000 // ₦3,000

// Format price from kobo to Naira
export function formatPrice(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`
}
