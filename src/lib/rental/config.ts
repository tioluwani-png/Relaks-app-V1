/**
 * Rental System Configuration
 *
 * Business values marked with "TODO: confirm value" should be reviewed
 * before going live.
 */

// Terms & Conditions
export const TERMS_VERSION = '2026-08-v1'
export const TERMS_URL = '/rent/terms'

// Replacement values (in Naira)
// TODO: confirm value - default replacement cost when book doesn't have specific value
export const DEFAULT_REPLACEMENT_VALUE_NAIRA = 15000

// Unreturned books
// TODO: confirm value - days past expiry before treating as unreturned
export const UNRETURNED_DAYS_THRESHOLD = 14

// Collection
// TODO: confirm value - max failed collection attempts before escalation
export const MAX_COLLECTION_ATTEMPTS = 2

// Delivery window
export const DELIVERY_WINDOW_DAYS = '2-4'
