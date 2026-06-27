# Relaks Web App

A community wellness platform for adult coloring enthusiasts.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Backend**: Supabase (auth, database, storage)
- **Styling**: Tailwind CSS 4 + shadcn/ui + Framer Motion
- **State**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Rich Text**: Tiptap editor
- **Payments**: Paystack
- **Email**: Resend + Mailchimp
- **Analytics**: Vercel Analytics

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, signup, onboarding)
│   ├── (main)/            # Authenticated user routes
│   │   ├── feed/          # Social feed
│   │   ├── discover/      # Browse pages, references, leaderboard
│   │   ├── create/        # Upload & AI generate coloring pages
│   │   ├── journal/       # Personal journaling
│   │   ├── profile/       # User profile, settings, credits
│   │   ├── reading/       # Reading club (books, wishlists, lists)
│   │   ├── books/         # Book catalog
│   │   ├── checkout/      # Cart and checkout flow
│   │   ├── orders/        # Order history and details
│   │   ├── references/    # Coloring page editions
│   │   ├── notifications/ # User notifications
│   │   └── search/        # Search functionality
│   ├── admin/             # Admin panel
│   ├── blog/              # Public blog
│   └── payment/           # Payment callbacks
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities, Supabase client, helpers
├── stores/                # Zustand stores
└── types/                 # TypeScript type definitions
```

## Key Features

1. **Authentication** - Email/password auth with Supabase, onboarding flow
2. **Social Feed** - Posts with images, likes, comments, follows
3. **Coloring Pages** - Upload and AI-generate coloring pages
4. **Reading Club** - Book catalog, wishlists, reading history, custom lists
5. **Book Rental** - Cart system, checkout with delivery, Paystack payments
6. **Journal** - Personal journaling with date-based history
7. **References** - Coloring page editions with individual pages
8. **Blog** - Public blog with user submission system
9. **Credits System** - Paystack payments for credits
10. **Admin Panel** - User management, content moderation, analytics

## UI Design

- **Font**: Plus Jakarta Sans
- **Colors**: Purple/pink gradient palette
- **Style**: Glass morphism, rounded-2xl components
- **Animations**: Framer Motion transitions

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

## Database

Supabase with the following storage buckets:
- `posts` - Post images
- `avatars` - User avatars
- `references` - Reference page images
- `coloring-pages` - Coloring page uploads
- `ai-generations` - AI-generated images
- `book-covers` - Book cover images (admin upload)

Key tables for rental system:
- `cart_items` - User shopping cart
- `rental_orders` - Order records with delivery details
- `rental_order_items` - Books in each order

## Book Rental System

- **Pricing**: ₦3,000 per book rental, ₦3,000 Lagos delivery (flat rate)
- **Cart**: Zustand store (`src/stores/cart-store.ts`) with optimistic updates
- **Checkout**: `/checkout` - cart review, delivery form, Paystack payment
- **Orders**: `/orders` - order history and tracking
- **Payment**: Paystack integration with webhook handling

## Recent Development

- Book rental/cart system with Paystack integration
- Book cover image upload in admin (replacing URL input)
- Reading Club Phase 2 - reviews, comments, list enhancements
- Reading Club Phase 1 - books, wishlists, reading history, lists
- Color theme picker for editions (replacing gradient inputs)
- Cache invalidation for editions after admin mutations

## TypeScript Notes

- New tables (cart_items, rental_orders, rental_order_items) require type casting in API routes until Supabase types are regenerated
- Pattern: `const orderTyped = order as { id: string; status: string }`
