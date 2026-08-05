# Reading Club Partner Dashboard - SQL Migration

Run these SQL blocks in order in Supabase SQL Editor.

---

## 1. Extend UserRole to include 'partner'

First, check current role constraint:
```sql
-- Check how role is constrained
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- Check for existing enum
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname LIKE '%role%' OR typname = 'user_role';
```

If role is TEXT (likely given TypeScript uses union type), no enum change needed - just update RLS policies.
If it's an enum, add the new value:

```sql
-- Add 'partner' to role enum (only if role is an enum type)
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';

-- If role is TEXT with a CHECK constraint, update it:
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check
--   CHECK (role IN ('user', 'moderator', 'admin', 'super_admin', 'partner'));
```

---

## 2. Create rental_expenses table

```sql
CREATE TABLE rental_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entered_by UUID NOT NULL REFERENCES users(id),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'delivery', 'book_purchase', 'book_replacement',
    'hosting', 'ads', 'verification', 'other'
  )),
  description TEXT NOT NULL,
  amount_naira INT NOT NULL CHECK (amount_naira > 0),
  cost_type TEXT NOT NULL DEFAULT 'rental_direct' CHECK (cost_type IN ('rental_direct', 'shared_overhead')),
  settlement_period_id UUID REFERENCES rental_settlement_periods(id),
  voided BOOLEAN NOT NULL DEFAULT false,
  voided_by UUID REFERENCES users(id),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rental_expenses_date ON rental_expenses(expense_date);
CREATE INDEX idx_rental_expenses_period ON rental_expenses(settlement_period_id);
CREATE INDEX idx_rental_expenses_category ON rental_expenses(category);

-- Enable RLS
ALTER TABLE rental_expenses ENABLE ROW LEVEL SECURITY;

-- Partner/Admin/Super_admin can read all expenses (full transparency)
CREATE POLICY "Club roles can read expenses"
  ON rental_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('partner', 'admin', 'super_admin')
    )
  );

-- Only admin/super_admin can insert expenses
CREATE POLICY "Admins can insert expenses"
  ON rental_expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Only admin/super_admin can update (for voiding)
CREATE POLICY "Admins can update expenses"
  ON rental_expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- No deletes - use voided flag instead
```

---

## 3. Create rental_settlement_periods table

```sql
CREATE TABLE rental_settlement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  total_revenue_naira INT,
  total_expenses_naira INT,
  net_profit_naira INT,
  relaks_share_naira INT,
  partner_share_naira INT,
  split_relaks_pct INT CHECK (split_relaks_pct >= 0 AND split_relaks_pct <= 100),
  split_partner_pct INT CHECK (split_partner_pct >= 0 AND split_partner_pct <= 100),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (period_end >= period_start),
  CONSTRAINT split_totals_100 CHECK (
    (split_relaks_pct IS NULL AND split_partner_pct IS NULL) OR
    (split_relaks_pct + split_partner_pct = 100)
  )
);

CREATE INDEX idx_settlement_periods_status ON rental_settlement_periods(status);
CREATE INDEX idx_settlement_periods_dates ON rental_settlement_periods(period_start, period_end);

-- Enable RLS
ALTER TABLE rental_settlement_periods ENABLE ROW LEVEL SECURITY;

-- Partner/Admin/Super_admin can read all periods
CREATE POLICY "Club roles can read settlement periods"
  ON rental_settlement_periods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('partner', 'admin', 'super_admin')
    )
  );

-- Only super_admin can create/update settlement periods
CREATE POLICY "Super admin can insert settlement periods"
  ON rental_settlement_periods FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can update settlement periods"
  ON rental_settlement_periods FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );
```

**NOTE:** Split percentages are NOT pre-seeded. The close-period UI requires entering them.

---

## 4. Add RLS policies for partner role on existing rental tables

```sql
-- rental_plans: partner can read active plans
DROP POLICY IF EXISTS "Anyone can read active plans" ON rental_plans;
CREATE POLICY "Authenticated users can read active plans"
  ON rental_plans FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('partner', 'admin', 'super_admin')
  ));

-- rental_subscriptions: partner can read all subscriptions
DROP POLICY IF EXISTS "Users can read own subscriptions" ON rental_subscriptions;
CREATE POLICY "Users can read own subscriptions or club roles read all"
  ON rental_subscriptions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('partner', 'admin', 'super_admin')
    )
  );

-- rental_subscription_books: partner can read all
DROP POLICY IF EXISTS "Users can read own subscription books" ON rental_subscription_books;
CREATE POLICY "Users read own or club roles read all subscription books"
  ON rental_subscription_books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rental_subscriptions
      WHERE rental_subscriptions.id = rental_subscription_books.subscription_id
      AND rental_subscriptions.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('partner', 'admin', 'super_admin')
    )
  );

-- rental_payments: partner can read all payments
DROP POLICY IF EXISTS "Users can read own payments" ON rental_payments;
CREATE POLICY "Users read own or club roles read all payments"
  ON rental_payments FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('partner', 'admin', 'super_admin')
    )
  );

-- books: partner can read all books (for catalogue management)
-- Check existing policy first
-- If there's a broad "authenticated can read" policy, note it
-- Otherwise add:
CREATE POLICY IF NOT EXISTS "Club roles can read all books"
  ON books FOR SELECT
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('partner', 'admin', 'super_admin')
    )
  );

-- book_requests: partner can read all requests
-- Add policy for partner to read book_requests
CREATE POLICY IF NOT EXISTS "Club roles can read book requests"
  ON book_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('partner', 'admin', 'super_admin')
    )
    OR user_id = auth.uid()
  );
```

---

## 5. Update rental_subscriptions for status changes (dispatched_at, delivered_at, returned_at)

These columns should already exist. If not:

```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'rental_subscriptions'
AND column_name IN ('dispatched_at', 'delivered_at', 'returned_at');

-- Add if missing:
-- ALTER TABLE rental_subscriptions ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
-- ALTER TABLE rental_subscriptions ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
-- ALTER TABLE rental_subscriptions ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
```

---

## 6. Add available_copies to books table if not present

```sql
-- Check if available_copies exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'books' AND column_name = 'available_copies';

-- Add if missing:
ALTER TABLE books ADD COLUMN IF NOT EXISTS available_copies INT DEFAULT 1;
ALTER TABLE books ADD COLUMN IF NOT EXISTS total_copies INT DEFAULT 1;
```

---

## 7. Verification Queries

Run after all migrations to verify setup:

```sql
-- Verify rental_expenses table
SELECT 'rental_expenses' as table_name, COUNT(*) as row_count FROM rental_expenses;

-- Verify rental_settlement_periods table
SELECT 'rental_settlement_periods' as table_name, COUNT(*) as row_count FROM rental_settlement_periods;

-- Verify partner can see rental tables (test with a partner user)
-- First assign partner role to a test user:
-- UPDATE users SET role = 'partner' WHERE email = 'partner-test@example.com';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN (
  'rental_expenses',
  'rental_settlement_periods',
  'rental_subscriptions',
  'rental_payments',
  'rental_plans',
  'books',
  'book_requests'
)
ORDER BY tablename, policyname;

-- Verify columns on rental_subscriptions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rental_subscriptions'
ORDER BY ordinal_position;
```

---

## Notes

- The `partner` role can VIEW all rental data but cannot WRITE to most tables
- Expenses can only be entered by admin/super_admin
- Settlement periods can only be created/closed by super_admin
- Split percentages are required fields when closing a period - no defaults
- Partner must NOT gain access to: posts, journal_entries, credit_transactions, comments, likes, reports, blog tables
- Verify existing RLS policies don't have `USING (true)` patterns that would leak data to partner
