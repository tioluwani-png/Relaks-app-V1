# Book Inventory SQL Migration

Run these SQL statements in Supabase SQL Editor.

---

## Step 1: Add manually_unavailable column to books

```sql
ALTER TABLE books
ADD COLUMN IF NOT EXISTS manually_unavailable BOOLEAN DEFAULT false;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_books_availability
ON books(is_active, manually_unavailable, available_copies)
WHERE is_active = true;
```

---

## Step 2: Add guard constraints (optional but recommended)

```sql
-- Ensure available_copies never goes negative
ALTER TABLE books
ADD CONSTRAINT chk_available_copies_non_negative
CHECK (available_copies >= 0);

-- Ensure available_copies never exceeds total_copies
ALTER TABLE books
ADD CONSTRAINT chk_available_not_exceeds_total
CHECK (available_copies <= total_copies);

-- Ensure total_copies is at least 0
ALTER TABLE books
ADD CONSTRAINT chk_total_copies_non_negative
CHECK (total_copies >= 0);
```

Note: If these constraints fail due to existing data, run this first:
```sql
-- Fix any existing data violations
UPDATE books SET available_copies = 0 WHERE available_copies < 0;
UPDATE books SET available_copies = total_copies WHERE available_copies > total_copies;
UPDATE books SET total_copies = 0 WHERE total_copies < 0;
```

---

## Verification

```sql
-- Check the new column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'books'
AND column_name = 'manually_unavailable';

-- Check constraints exist
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'books'
AND constraint_type = 'CHECK';
```

---

## Rollback (if needed)

```sql
-- Remove constraints
ALTER TABLE books DROP CONSTRAINT IF EXISTS chk_available_copies_non_negative;
ALTER TABLE books DROP CONSTRAINT IF EXISTS chk_available_not_exceeds_total;
ALTER TABLE books DROP CONSTRAINT IF EXISTS chk_total_copies_non_negative;

-- Remove column
ALTER TABLE books DROP COLUMN IF EXISTS manually_unavailable;

-- Remove index
DROP INDEX IF EXISTS idx_books_availability;
```
