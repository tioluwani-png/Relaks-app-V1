# Terms & Conditions SQL Migration

Run these SQL statements in Supabase SQL Editor in order.

## Step 1: Add replacement_value_naira to books table

```sql
-- Add replacement value column to books
-- NULL means "use default from config" (currently ₦15,000)
ALTER TABLE books
ADD COLUMN IF NOT EXISTS replacement_value_naira INTEGER;

-- Add comment for clarity
COMMENT ON COLUMN books.replacement_value_naira IS 'Replacement cost in Naira if lost/damaged. NULL = use default (₦15,000)';
```

## Step 2: Add terms columns to rental_subscriptions

```sql
-- Add terms acceptance tracking
ALTER TABLE rental_subscriptions
ADD COLUMN IF NOT EXISTS terms_version TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN rental_subscriptions.terms_version IS 'Version of terms accepted at checkout (e.g., 2026-08-v1)';
COMMENT ON COLUMN rental_subscriptions.terms_accepted_at IS 'Server timestamp when terms were accepted';
```

## Step 3: Create index for querying by terms version (optional, for analytics)

```sql
-- Index for finding subscriptions by terms version (useful for migrations/audits)
CREATE INDEX IF NOT EXISTS idx_rental_subscriptions_terms_version
ON rental_subscriptions(terms_version)
WHERE terms_version IS NOT NULL;
```

## Verification Query

Run this to verify the columns were added:

```sql
-- Check books table has replacement_value_naira
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'books'
AND column_name = 'replacement_value_naira';

-- Check rental_subscriptions has terms columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rental_subscriptions'
AND column_name IN ('terms_version', 'terms_accepted_at')
ORDER BY column_name;

-- Should return:
-- replacement_value_naira | integer | YES
-- terms_accepted_at | timestamp with time zone | YES
-- terms_version | text | YES
```

## Rollback (if needed)

```sql
-- Remove columns (WARNING: data loss)
ALTER TABLE books DROP COLUMN IF EXISTS replacement_value_naira;
ALTER TABLE rental_subscriptions DROP COLUMN IF EXISTS terms_version;
ALTER TABLE rental_subscriptions DROP COLUMN IF EXISTS terms_accepted_at;
DROP INDEX IF EXISTS idx_rental_subscriptions_terms_version;
```
