# Rental Lifecycle SQL Migration

Run these SQL statements in Supabase SQL Editor in order.

---

## Step 1: Add new columns to rental_subscriptions

```sql
ALTER TABLE rental_subscriptions
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;
```

---

## Step 2: Add performance indexes

```sql
-- Index for cron queries on expires_at
CREATE INDEX IF NOT EXISTS idx_rental_subscriptions_expires_at
ON rental_subscriptions(expires_at)
WHERE status IN ('delivered', 'active');

-- Index for auto_renew queries
CREATE INDEX IF NOT EXISTS idx_rental_subscriptions_auto_renew
ON rental_subscriptions(auto_renew)
WHERE auto_renew = true;
```

---

## Step 3: Create rental_book_ratings table

```sql
CREATE TABLE IF NOT EXISTS rental_book_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES rental_subscriptions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES rental_books(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT CHECK (char_length(review) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription_id, book_id)
);

-- Indexes for rental_book_ratings
CREATE INDEX IF NOT EXISTS idx_rental_book_ratings_user
ON rental_book_ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_rental_book_ratings_subscription
ON rental_book_ratings(subscription_id);

CREATE INDEX IF NOT EXISTS idx_rental_book_ratings_book
ON rental_book_ratings(book_id);
```

---

## Step 4: Create rental_email_log table

```sql
CREATE TABLE IF NOT EXISTS rental_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES rental_subscriptions(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, email_type)
);

-- Index for rental_email_log
CREATE INDEX IF NOT EXISTS idx_rental_email_log_subscription
ON rental_email_log(subscription_id);
```

Valid `email_type` values:
- `'delivery_confirmation'` - Sent when books are delivered
- `'expiry_reminder'` - Sent 7 days before expiry
- `'renewal_receipt'` - Sent after successful auto-renewal
- `'renewal_failed'` - Sent when auto-renewal charge fails
- `'collection_scheduled'` - Sent when rental expires without renewal

---

## Step 5: Enable RLS on new tables

```sql
ALTER TABLE rental_book_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_email_log ENABLE ROW LEVEL SECURITY;
```

---

## Step 6: RLS policies for rental_book_ratings

```sql
-- Users can view their own ratings
CREATE POLICY "Users can view own ratings"
ON rental_book_ratings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert ratings for books in their own subscriptions
CREATE POLICY "Users can insert own ratings"
ON rental_book_ratings FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM rental_subscription_books rsb
    JOIN rental_subscriptions rs ON rs.id = rsb.subscription_id
    WHERE rsb.subscription_id = rental_book_ratings.subscription_id
    AND rsb.book_id = rental_book_ratings.book_id
    AND rs.user_id = auth.uid()
  )
);

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
ON rental_book_ratings FOR UPDATE
USING (auth.uid() = user_id);

-- Club admins can view all ratings (for analytics/moderation)
CREATE POLICY "Club admins can view all ratings"
ON rental_book_ratings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('partner', 'admin', 'super_admin')
  )
);
```

---

## Step 7: RLS policies for rental_email_log

```sql
-- Users can view their own email logs
CREATE POLICY "Users can view own email logs"
ON rental_email_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rental_subscriptions rs
    WHERE rs.id = rental_email_log.subscription_id
    AND rs.user_id = auth.uid()
  )
);

-- Service role can insert (for cron/admin operations)
-- Note: Inserts will be done via admin client, so no user-facing insert policy needed
```

---

## Step 8: Backfill existing active subscriptions (optional)

If you have existing subscriptions with status 'active' and delivered_at set, you may want to update them to 'delivered':

```sql
-- Preview what would be updated
SELECT id, status, delivered_at, expires_at
FROM rental_subscriptions
WHERE status = 'active'
AND delivered_at IS NOT NULL;

-- If the above looks correct, run:
-- UPDATE rental_subscriptions
-- SET status = 'delivered'
-- WHERE status = 'active'
-- AND delivered_at IS NOT NULL;
```

---

## Verification Queries

After running the migration, verify with these queries:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rental_subscriptions'
AND column_name IN ('picked_up_at', 'in_transit_at', 'auto_renew');

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rental_book_ratings', 'rental_email_log');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('rental_book_ratings', 'rental_email_log');

-- Check indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_rental%';
```

---

## Rollback (if needed)

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_rental_subscriptions_expires_at;
DROP INDEX IF EXISTS idx_rental_subscriptions_auto_renew;
DROP INDEX IF EXISTS idx_rental_book_ratings_user;
DROP INDEX IF EXISTS idx_rental_book_ratings_subscription;
DROP INDEX IF EXISTS idx_rental_book_ratings_book;
DROP INDEX IF EXISTS idx_rental_email_log_subscription;

-- Remove tables (WARNING: deletes all data)
DROP TABLE IF EXISTS rental_email_log;
DROP TABLE IF EXISTS rental_book_ratings;

-- Remove columns
ALTER TABLE rental_subscriptions
DROP COLUMN IF EXISTS picked_up_at,
DROP COLUMN IF EXISTS in_transit_at,
DROP COLUMN IF EXISTS auto_renew;
```
