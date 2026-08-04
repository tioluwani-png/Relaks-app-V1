# Rental Conversion Audit

## Current State Analysis

### Two Parallel Rental Flows (Problem)

**1. Cart-Based Flow (OLD - TO BE DELETED)**
- Entry: `/books` → Book catalog with "Add to Cart" buttons
- Cart page: `/checkout` with Cart → Delivery → Pay stepper
- Pricing: ₦3,000 per book + ₦3,000 delivery (itemized)
- Tables: `cart_items`, `rental_orders`, `rental_order_items`

**2. Plan-Based Flow (NEW - TO BE KEPT/ENHANCED)**
- Entry: `/rent` → Plan selection → `/rent/catalogue` → Book selection
- Checkout: `/rent/checkout` with Books → Delivery → Pay
- Pricing: ₦14,000 (Monthly, 2 books) or ₦28,500 (Quarterly, 5 books) all-in
- Tables: `rental_plans`, `rental_subscriptions`, `rental_subscription_books`, `rental_payments`

### Issue Identified
The `/rent` page plan section is likely rendering empty because **the seed SQL was never run** - `rental_plans` table exists but has no rows.

---

## Files TO BE MODIFIED

### Header (Remove Cart)
- `src/components/layout/header.tsx`
  - Remove: `useCartStore` import and usage
  - Remove: Cart icon and badge
  - Keep: Rent Books icon (links to /rent)

### Book Components (Remove Cart/Pricing)
- `src/components/books/book-detail.tsx`
  - Remove: `useCartStore`, `BOOK_RENTAL_PRICE`, `formatPrice` imports
  - Remove: `handleAddToCart` function
  - Remove: Cart-related props passed to `BookActions`
  - Remove: "Rent this book: ₦3,000" pricing box
  - Add: Link to `/rent` for renting

- `src/components/books/book-actions.tsx`
  - Remove: Cart button entirely (`ShoppingCart` icon, `isInCart`, `onAddToCart` props)
  - Keep: Like, Save, Reading Status actions

- `src/components/books/book-card.tsx`
  - Remove: Any price display if present

### Existing Rent Pages (Keep/Fix)
- `src/app/(main)/rent/page.tsx` - Add error state for empty plans
- `src/app/(main)/rent/catalogue/page.tsx` - Already correct
- `src/app/(main)/rent/checkout/page.tsx` - Already correct
- `src/app/(main)/rent/success/page.tsx` - Already correct
- `src/app/(main)/rent/my-rentals/page.tsx` - Already correct

### Books Page (Add Plan Entry)
- `src/app/(main)/books/page.tsx`
  - Add: Banner/CTA linking to `/rent` for book rental club
  - Keep: Book browsing for reading club (likes, saves, reviews)

---

## Files TO BE DELETED

### Cart Store
- `src/stores/cart-store.ts`

### Cart API Routes
- `src/app/api/cart/route.ts`
- `src/app/api/cart/[bookId]/route.ts`
- `src/app/api/cart/clear/route.ts`

### Cart-Based Checkout
- `src/app/(main)/checkout/page.tsx`

### Old Order Routes (if cart-specific)
- `src/app/api/orders/route.ts` - Creates orders from cart
- `src/app/api/orders/[id]/route.ts` - Gets order details
- `src/app/api/orders/[id]/pay/route.ts` - Initializes payment for cart orders
- `src/app/(main)/orders/page.tsx` - Order history (cart-based)
- `src/app/(main)/orders/[id]/page.tsx` - Order detail (cart-based)
- `src/app/payment/rental/callback/page.tsx` - Uses cart store

### Pricing Module (Cart-specific)
- `src/lib/pricing.ts` - Contains `BOOK_RENTAL_PRICE`, `LAGOS_DELIVERY_FEE`

---

## Database Status

### Tables to Check
1. `rental_plans` - **LIKELY EMPTY** (cause of empty plan section)
2. `rental_subscriptions` - New table for subscriptions
3. `rental_subscription_books` - Junction table
4. `rental_payments` - Payment records
5. `rental_books` - Book catalog for rentals (separate from `books` table)

### Tables to Keep (but no longer write to from app)
- `cart_items` - Can be dropped or left unused
- `rental_orders` - Old orders, keep for history
- `rental_order_items` - Old order items, keep for history

---

## Conversion Summary

| Action | Files |
|--------|-------|
| **Delete** | 11 files (cart store, cart API, checkout, pricing, orders) |
| **Modify** | 5 files (header, book-detail, book-actions, book-card, rent landing) |
| **Keep** | 5 files (/rent/*, rental API routes) |

---

## Root Cause of Empty Plans

The `/rent` page fetches from `/api/rental/plans` which queries `rental_plans` table. The seed SQL in `RENTAL_PHASE2_TABLES.md` was likely never executed in Supabase, leaving the table empty.

**Fix:** Run the seed SQL or add error handling for empty state.
