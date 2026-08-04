# Books Consolidation Audit

## Problem
Two book browsing pages exist:
1. **Original "Reading Club"** (`/books`) - Works correctly, shows books
2. **New "Choose Your Books"** (`/rent/catalogue`) - Shows "No books available"

## Root Cause Analysis

### Original Books Page (`/books`)
- **Component**: `src/app/(main)/books/page.tsx` → `BookCatalog` → `useBooks` hook
- **API**: `/api/books` (`src/app/api/books/route.ts`)
- **Table**: `books`
- **Query**: `from('books').select('*, genre:book_genres(...)').eq('is_active', true)`
- **Status**: WORKS - books exist in this table

### New Catalogue Page (`/rent/catalogue`)
- **Component**: `src/app/(main)/rent/catalogue/page.tsx`
- **API**: `/api/rental/books` (`src/app/api/rental/books/route.ts`)
- **Table**: `rental_books`
- **Query**: `from('rental_books').eq('is_active', true).gt('available_copies', 0)`
- **Status**: EMPTY - `rental_books` table either doesn't exist or has no active rows

### The Mismatch
| Aspect | Original (`/books`) | New (`/rent/catalogue`) |
|--------|---------------------|-------------------------|
| Table | `books` | `rental_books` |
| Genre handling | `genre_id` → `book_genres` relation | `genre` text column |
| Filters | `is_active = true` | `is_active = true` AND `available_copies > 0` |
| Features | Search, sort, likes, saves, read status | Genre filter only |

Books were added to the `books` table via admin panel. The `rental_books` table was created for Phase 2 but never populated.

## Decision: Canonical Table = `books`

The `books` table is the correct source:
- Already has all the book data
- Has rich relations (genres, likes, saves, read status)
- Admin panel manages this table
- No migration needed

The `rental_books` table should be deprecated.

## Solution

1. **Delete** `/rent/catalogue` page entirely
2. **Modify** `/books` page to support selection mode:
   - When `?plan={id}` param present → show selection UI
   - Without param → normal browse mode (unchanged)
3. **Update** `/api/rental/books` to query `books` table (for checkout to validate selected books)
4. **Selection state**: React state + URL params (no localStorage)

## Files Deleted
- `src/app/(main)/rent/catalogue/page.tsx` - Duplicate book selection page

## Files Modified
- `src/app/(main)/books/page.tsx` - Now client component with selection mode support
- `src/components/books/book-catalog.tsx` - Added selection mode UI (banner, selectable cards, bottom bar)
- `src/app/api/rental/books/route.ts` - Now queries `books` table instead of `rental_books`
- `src/app/(main)/rent/page.tsx` - Links to `/books?plan={id}` instead of `/rent/catalogue`
- `src/app/(main)/rent/checkout/page.tsx` - Back link goes to `/books`, updated types
- `src/app/api/rental/orders/create/route.ts` - Validates books from `books` table

## SQL Migration Required
See `BOOKS_CONSOLIDATION_SQL.md` for SQL to update the foreign key on `rental_subscription_books` to reference `books` instead of `rental_books`.
