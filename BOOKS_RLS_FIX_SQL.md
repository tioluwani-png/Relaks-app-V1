# Books Table RLS Fix for Partner Role

**Table confirmed:** The club-admin form inserts into `books` (not `rental_books`).

**About `rental_books`:** This type exists in database.ts but no table/migration exists. It's likely stale generated types from a renamed/removed table, or a Supabase view. All code paths use `books`. See audit section at end.

---

## STEP 1: Run Diagnostics First

Run these queries to see current state before making changes:

```sql
-- Check what tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('books', 'rental_books');

-- List ALL current policies on books table
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as using_expr,
  with_check::text as with_check_expr
FROM pg_policies
WHERE tablename = 'books'
ORDER BY policyname;

-- Check if rental_books exists (table or view)
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'rental_books';
```

---

## STEP 2: Apply the Fix

```sql
-- =============================================
-- BOOKS TABLE: Partner INSERT/UPDATE policies
-- =============================================

-- Drop any existing partner policies (clean slate)
DROP POLICY IF EXISTS "Partners can insert books" ON books;
DROP POLICY IF EXISTS "Partners can update books" ON books;
DROP POLICY IF EXISTS "Club admins can insert books" ON books;
DROP POLICY IF EXISTS "Club admins can update books" ON books;

-- Drop and recreate the admin policy to ensure clean state
DROP POLICY IF EXISTS "Admins can manage books" ON books;
DROP POLICY IF EXISTS "Admins can fully manage books" ON books;

-- Recreate admin full-access policy
CREATE POLICY "Admins can fully manage books"
  ON books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Partner INSERT policy
CREATE POLICY "Partners can insert books"
  ON books FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'partner'
    )
  );

-- Partner UPDATE policy
CREATE POLICY "Partners can update books"
  ON books FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'partner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'partner'
    )
  );

-- Partner SELECT policy (needed to read books they manage)
CREATE POLICY "Partners can view all books"
  ON books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'partner'
    )
  );

-- NOTE: DELETE stays admin-only. Partners use is_active = false.


-- =============================================
-- BOOK_REQUESTS TABLE: Partner management
-- =============================================

DROP POLICY IF EXISTS "Admins can update requests" ON book_requests;
DROP POLICY IF EXISTS "Admins and partners can update requests" ON book_requests;

CREATE POLICY "Admins and partners can update requests"
  ON book_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'partner')
    )
  );


-- =============================================
-- STORAGE: book-covers bucket (if not done)
-- =============================================

-- Create bucket if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Clean up any existing policies for this bucket
DROP POLICY IF EXISTS "Anyone can view book covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins and partners can upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins and partners can update book covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete book covers" ON storage.objects;

-- Recreate storage policies
CREATE POLICY "Anyone can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Admins and partners can upload book covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'partner')
    )
  );

CREATE POLICY "Admins and partners can update book covers"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'book-covers'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'partner')
    )
  );

CREATE POLICY "Admins can delete book covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

---

## STEP 3: Verify Fix Applied

```sql
-- Confirm books policies now include partner
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'books'
ORDER BY cmd, policyname;

-- Expected output should show:
-- "Partners can insert books" | INSERT | ...
-- "Partners can update books" | UPDATE | ...
-- "Partners can view all books" | SELECT | ...
-- "Admins can fully manage books" | ALL | ...
-- "Anyone can read active books" | SELECT | ... (existing public policy)

-- Confirm storage policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND qual::text LIKE '%book-covers%';
```

---

## Table Audit: `books` vs `rental_books`

### Finding
- **`books`** - The actual table used by all code paths
- **`rental_books`** - Type exists in `database.ts` but NO table/migration found

### Code paths using `books`:
- `/api/books` (GET, POST) - catalog listing, admin create
- `/api/books/[id]` (GET, PATCH, DELETE) - detail, admin update
- `/api/rental/books` - rental catalog listing
- `/api/rental/orders/create` - order creation checks availability
- `/api/rental/payments/verify` - updates available_copies on payment
- `/club-admin/books/page.tsx` - partner book management

### Recommendation
The `rental_books` type in `database.ts` is orphaned. Either:
1. Delete it from types (regenerate types from Supabase)
2. Or leave it - it's unused and harmless

No consolidation needed - there's only one table.
