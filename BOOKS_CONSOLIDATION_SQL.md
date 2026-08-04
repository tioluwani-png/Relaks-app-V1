# Books Consolidation SQL Migration

Run this SQL in Supabase SQL Editor to consolidate to the `books` table.

## The Problem
The `rental_subscription_books` table was created with a foreign key to `rental_books`, but we're now using the main `books` table.

## Migration Steps

### Step 1: Check existing data
```sql
-- Check if rental_subscription_books has any data
SELECT COUNT(*) as subscription_book_count FROM rental_subscription_books;

-- Check if rental_subscriptions has any data
SELECT COUNT(*) as subscription_count FROM rental_subscriptions;
```

If both are 0, proceed with Step 2. If there's data, skip to Step 3.

### Step 2: Drop and recreate rental_subscription_books (if empty)
```sql
-- Drop the table with old foreign key
DROP TABLE IF EXISTS rental_subscription_books;

-- Recreate with correct foreign key to books table
CREATE TABLE rental_subscription_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES rental_subscriptions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id),
  returned BOOLEAN DEFAULT false,
  returned_at TIMESTAMPTZ,
  UNIQUE(subscription_id, book_id)
);

-- Index
CREATE INDEX idx_rental_subscription_books_subscription_id ON rental_subscription_books(subscription_id);

-- Enable RLS
ALTER TABLE rental_subscription_books ENABLE ROW LEVEL SECURITY;

-- Users can read books from their subscriptions
CREATE POLICY "Users can read own subscription books"
  ON rental_subscription_books
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rental_subscriptions
      WHERE rental_subscriptions.id = rental_subscription_books.subscription_id
      AND rental_subscriptions.user_id = auth.uid()
    )
  );

-- Block client writes (service role only)
CREATE POLICY "Block client writes on subscription books"
  ON rental_subscription_books
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block client updates on subscription books"
  ON rental_subscription_books
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Admins full access
CREATE POLICY "Admins full access to subscription books"
  ON rental_subscription_books
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );
```

### Step 3: If table has data - alter foreign key constraint
```sql
-- Only use this if you have existing subscription data to preserve

-- Drop the old foreign key constraint
ALTER TABLE rental_subscription_books
DROP CONSTRAINT IF EXISTS rental_subscription_books_book_id_fkey;

-- Add new foreign key to books table
ALTER TABLE rental_subscription_books
ADD CONSTRAINT rental_subscription_books_book_id_fkey
FOREIGN KEY (book_id) REFERENCES books(id);
```

### Step 4: Verify
```sql
-- Check that books can be referenced
SELECT
  rsb.id as subscription_book_id,
  b.title as book_title
FROM rental_subscription_books rsb
LEFT JOIN books b ON b.id = rsb.book_id
LIMIT 10;

-- Check constraint
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table
FROM pg_constraint
WHERE conname = 'rental_subscription_books_book_id_fkey';
```

## Notes
- The `rental_books` table is now deprecated
- All book data lives in the `books` table
- The admin panel manages books in the `books` table
- No data migration needed since books were never in `rental_books`
