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
5. **Journal** - Personal journaling with date-based history
6. **References** - Coloring page editions with individual pages
7. **Blog** - Public blog with user submission system
8. **Credits System** - Paystack payments for credits
9. **Admin Panel** - User management, content moderation, analytics

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

## Recent Development

- Reading Club feature (Phase 1) - books, wishlists, reading history, lists
- Color theme picker for editions (replacing gradient inputs)
- Cache invalidation for editions after admin mutations
