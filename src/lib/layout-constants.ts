/**
 * Shared layout constants for consistent spacing
 * Bottom nav height: h-16 (64px) + safe area
 * Selection bar height: ~88px (py-4 + content)
 */

// Tailwind classes for bottom nav offset
export const BOTTOM_NAV_HEIGHT = 'h-16' // 64px
export const BOTTOM_NAV_OFFSET = 'bottom-16' // Position above nav
export const BOTTOM_NAV_SAFE_AREA = 'pb-[env(safe-area-inset-bottom)]'

// Combined offset for elements above bottom nav (nav height + safe area)
export const ABOVE_NAV_BOTTOM = 'bottom-[calc(4rem+env(safe-area-inset-bottom))]'

// Page padding when bottom nav is present
export const PAGE_BOTTOM_PADDING = 'pb-20' // Accounts for nav

// Page padding when selection bar AND bottom nav are present
// Nav (64px) + Selection bar (~88px) + buffer = ~160px
export const PAGE_BOTTOM_PADDING_WITH_SELECTION = 'pb-44'
