# Partner Book Management - SQL Fixes

Run this SQL in your Supabase SQL Editor to enable partners to manage books and upload covers.

## What This Fixes

1. **RLS on `books` table** - Partners can INSERT and UPDATE books (not DELETE)
2. **Storage bucket `book-covers`** - Creates bucket and grants partners upload access
3. **RLS on `book_requests` table** - Partners can UPDATE request status (approve/reject)

---

## The SQL (Run This)

```sql
-- =============================================
-- FIX 1: Books table - Allow partners to INSERT/UPDATE
-- =============================================

-- First, let's check existing policies (for reference only)
-- SELECT * FROM pg_policies WHERE tablename = 'books';

-- Drop the existing "Admins can manage books" policy
-- We'll replace it with separate policies for better control
DROP POLICY IF EXISTS "Admins can manage books" ON books;

-- Policy: Admins can do everything (SELECT/INSERT/UPDATE/DELETE)
CREATE POLICY "Admins can fully manage books"
  ON books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Partners can INSERT new books
CREATE POLICY "Partners can insert books"
  ON books FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'partner'
    )
  );

-- Policy: Partners can UPDATE books
CREATE POLICY "Partners can update books"
  ON books FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'partner'
    )
  );

-- NOTE: Partners CANNOT delete books - they should set is_active = false instead


-- =============================================
-- FIX 2: Create book-covers storage bucket
-- =============================================

-- Create the bucket (public for reading covers)
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Anyone can view book covers
CREATE POLICY "Anyone can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

-- Policy: Admins and partners can upload book covers
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

-- Policy: Admins and partners can update/replace book covers
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

-- Policy: Only admins can delete book covers
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


-- =============================================
-- FIX 3: Book requests - Allow partners to manage
-- =============================================

-- Drop the existing admin-only update policy
DROP POLICY IF EXISTS "Admins can update requests" ON book_requests;

-- New policy: Admins AND partners can update requests
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
-- VERIFICATION QUERIES (Optional - run to verify)
-- =============================================

-- Check books policies
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'books';

-- Check storage policies for book-covers
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'objects'
-- AND qual::text LIKE '%book-covers%';

-- Check book_requests policies
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'book_requests';
```

---

## After Running

1. Test with a partner account:
   - Open `/club-admin/books`
   - Fill in the Add Book form with a cover image
   - Verify the book is created successfully

2. Verify in Supabase Dashboard:
   - Storage > `book-covers` bucket should exist and show uploaded covers
   - Database > `books` table should have the new book

3. Check console for any remaining errors with `[BOOKS_ADMIN]` prefix

---

## Rollback (If Needed)

```sql
-- Restore original admin-only policies
DROP POLICY IF EXISTS "Admins can fully manage books" ON books;
DROP POLICY IF EXISTS "Partners can insert books" ON books;
DROP POLICY IF EXISTS "Partners can update books" ON books;

CREATE POLICY "Admins can manage books"
  ON books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Remove partner storage policies
DROP POLICY IF EXISTS "Admins and partners can upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins and partners can update book covers" ON storage.objects;

-- Restore admin-only book_requests policy
DROP POLICY IF EXISTS "Admins and partners can update requests" ON book_requests;
CREATE POLICY "Admins can update requests"
  ON book_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```
