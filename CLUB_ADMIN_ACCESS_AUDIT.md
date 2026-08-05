# Reading Club Partner Dashboard - Access Audit

## Partner Role Access Summary

### Tables Partner CAN Read (after SQL migration)

| Table | Access Level | Notes |
|-------|--------------|-------|
| `rental_plans` | Full read | All plans (active and inactive for admin view) |
| `rental_subscriptions` | Full read | All customer orders/subscriptions |
| `rental_subscription_books` | Full read | Books in each subscription |
| `rental_payments` | Full read | All payment records |
| `rental_expenses` | Full read | Full expense transparency |
| `rental_settlement_periods` | Full read | All settlement history |
| `books` | Full read | Book catalogue (active + inactive) |
| `book_genres` | Full read | For genre display |
| `book_requests` | Full read | Customer book requests |
| `users` (limited) | Username only | Via subscription joins - only fields needed for order display |

### Tables Partner CANNOT Read

| Table | Reason |
|-------|--------|
| `posts` | Relaks app content - not rental related |
| `post_comments` | User social interactions |
| `post_likes` | User social interactions |
| `post_saves` | User social interactions |
| `journal_entries` | Private user journals |
| `credit_transactions` | Relaks credits system (separate from rental) |
| `ai_generations` | AI feature usage |
| `coloring_pages` | Coloring feature |
| `reference_pages` | Coloring references |
| `editions` | Coloring editions |
| `blog_posts` | Blog content |
| `blog_submissions` | Blog submissions |
| `reports` | User reports/moderation |
| `notifications` | User notifications |
| `followers` | Social graph |
| `book_likes` | User engagement (reading club users only see their own) |
| `book_saves` | User engagement (reading club users only see their own) |
| `book_reviews` | User reviews (public read, but partner doesn't need admin access) |
| `reading_lists` | User reading lists |

### Partner Write Access

| Table | Insert | Update | Delete |
|-------|--------|--------|--------|
| `rental_expenses` | NO | NO | NO (voided flag instead) |
| `rental_settlement_periods` | NO | NO | NO |
| `rental_subscriptions` | NO | NO | NO |
| `rental_payments` | NO | NO | NO |
| `books` | NO | NO | NO |
| `book_requests` | NO | NO | NO |

**All writes are admin/super_admin only.** Partner is view-only.

## Route Access

### Partner CAN Access

- `/club-admin` - Dashboard overview
- `/club-admin/orders` - Order management
- `/club-admin/orders/[id]` - Order detail
- `/club-admin/books` - Book catalogue
- `/club-admin/requests` - Book requests
- `/club-admin/finances` - Revenue & expenses (read-only)
- `/club-admin/settlements` - Settlement periods (read-only)

### Partner CANNOT Access

- `/admin` - Entire admin dashboard
- `/admin/*` - All admin routes
- `/api/admin/*` - Admin API routes
- `/api/ai/*` - AI generation routes
- `/api/posts/*` - Post management
- `/api/journal/*` - Journal routes
- Any user management endpoints

## Pre-Existing Policy Audit

### Potential Over-Broad Policies to Check

Run this query to find any `USING (true)` or `USING (auth.uid() IS NOT NULL)` policies:

```sql
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE qual LIKE '%true%' OR qual LIKE '%auth.uid() IS NOT NULL%'
ORDER BY tablename;
```

### Known Patterns

1. **books table**: May have `is_active = true` public read - OK, doesn't expose private data
2. **book_genres table**: Likely public read - OK, reference data
3. **users table**: Check for broad SELECT policies - partner should NOT see full user data

### Recommended Verification

After assigning partner role to a test account:

1. Try accessing `/admin` - should redirect to `/club-admin` or `/feed`
2. Try fetching `/api/admin/editions` - should return 403
3. Try querying `posts` table via Supabase client - should return empty/error
4. Verify can read `rental_subscriptions` - should work
5. Verify cannot INSERT into `rental_expenses` - should fail

## Middleware Configuration

### Current ADMIN_PATHS
```typescript
const ADMIN_PATHS = ['/admin']
```

### Updated Configuration Needed
```typescript
const ADMIN_PATHS = ['/admin']
const CLUB_ADMIN_PATHS = ['/club-admin']

// In role check:
if (isAdminPath) {
  const adminRoles = ['moderator', 'admin', 'super_admin']
  // partner NOT included - blocked from /admin
}

if (isClubAdminPath) {
  const clubRoles = ['partner', 'admin', 'super_admin']
  // moderator NOT included
}
```

## Test Checklist

- [ ] Partner can log in and access `/club-admin`
- [ ] Partner gets redirected from `/admin` to `/club-admin` or `/feed`
- [ ] Partner can view all orders in `/club-admin/orders`
- [ ] Partner can view all books in `/club-admin/books`
- [ ] Partner CANNOT add/edit books
- [ ] Partner can view finances but CANNOT add expenses
- [ ] Partner can view settlements but CANNOT close periods
- [ ] Moderator can still access `/admin` normally
- [ ] Moderator CANNOT access `/club-admin`
- [ ] Admin/super_admin can access BOTH dashboards
