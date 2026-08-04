# Rental Conversion SQL

Run these queries in order in the Supabase SQL Editor.

---

## 1. DIAGNOSTIC: Check if rental_plans exists and has rows

```sql
-- Run this FIRST to diagnose why plans are not showing
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rental_plans'
  ) as table_exists,
  (SELECT COUNT(*) FROM rental_plans WHERE is_active = true) as active_plan_count;

-- If table_exists = true but active_plan_count = 0, the seed never ran
-- If table_exists = false, run the CREATE TABLE below
```

---

## 2. Create rental_plans table (if not exists)

```sql
-- Skip if diagnostic shows table_exists = true

-- Create enum for swap frequency (if not exists)
DO $$ BEGIN
  CREATE TYPE swap_frequency AS ENUM ('monthly', 'end_of_term');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create rental_plans table
CREATE TABLE IF NOT EXISTS rental_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  books_per_cycle INT NOT NULL,
  duration_days INT NOT NULL,
  price_naira INT NOT NULL,
  delivery_included BOOLEAN DEFAULT true,
  swap_frequency swap_frequency NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rental_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans
CREATE POLICY "Anyone can read active plans"
  ON rental_plans
  FOR SELECT
  USING (is_active = true);

-- Admins can manage plans
CREATE POLICY "Admins can manage plans"
  ON rental_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );
```

---

## 3. Seed the two plans (CRITICAL - this is likely the missing step)

```sql
-- Delete any existing plans first to avoid duplicates
DELETE FROM rental_plans;

-- Insert the two plans
INSERT INTO rental_plans (name, description, books_per_cycle, duration_days, price_naira, swap_frequency, sort_order, is_active) VALUES
('Monthly', '2 books every month, delivered and swapped at your door. Delivery included.', 2, 30, 14000, 'monthly', 1, true),
('Quarterly', '5 books for 3 months, delivered together. Delivery included.', 5, 90, 28500, 'end_of_term', 2, true);

-- Verify
SELECT id, name, books_per_cycle, price_naira, swap_frequency, is_active FROM rental_plans ORDER BY sort_order;
```

---

## 4. Create rental_subscription_status enum (if not exists)

```sql
DO $$ BEGIN
  CREATE TYPE rental_subscription_status AS ENUM (
    'pending_payment',
    'active',
    'awaiting_return',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

---

## 5. Create rental_subscriptions table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS rental_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES rental_plans(id),
  status rental_subscription_status NOT NULL DEFAULT 'pending_payment',
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  delivery_lga TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_subscriptions_user_id ON rental_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_subscriptions_status ON rental_subscriptions(status);

-- Enable RLS
ALTER TABLE rental_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
DROP POLICY IF EXISTS "Users can read own subscriptions" ON rental_subscriptions;
CREATE POLICY "Users can read own subscriptions"
  ON rental_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Block all client writes (service role only)
DROP POLICY IF EXISTS "Block client writes" ON rental_subscriptions;
CREATE POLICY "Block client writes"
  ON rental_subscriptions
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates" ON rental_subscriptions;
CREATE POLICY "Block client updates"
  ON rental_subscriptions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Admins full access
DROP POLICY IF EXISTS "Admins full access to subscriptions" ON rental_subscriptions;
CREATE POLICY "Admins full access to subscriptions"
  ON rental_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );
```

---

## 6. Create rental_subscription_books table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS rental_subscription_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES rental_subscriptions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES rental_books(id),
  returned BOOLEAN DEFAULT false,
  returned_at TIMESTAMPTZ,
  UNIQUE(subscription_id, book_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_rental_subscription_books_subscription_id ON rental_subscription_books(subscription_id);

-- Enable RLS
ALTER TABLE rental_subscription_books ENABLE ROW LEVEL SECURITY;

-- Users can read books from their subscriptions
DROP POLICY IF EXISTS "Users can read own subscription books" ON rental_subscription_books;
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

-- Block all client writes
DROP POLICY IF EXISTS "Block client writes on subscription books" ON rental_subscription_books;
CREATE POLICY "Block client writes on subscription books"
  ON rental_subscription_books
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates on subscription books" ON rental_subscription_books;
CREATE POLICY "Block client updates on subscription books"
  ON rental_subscription_books
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Admins full access
DROP POLICY IF EXISTS "Admins full access to subscription books" ON rental_subscription_books;
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

---

## 7. Create rental_payments table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES rental_subscriptions(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES rental_plans(id),
  amount_naira INT NOT NULL,
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_status TEXT NOT NULL DEFAULT 'pending',
  authorization_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_payments_user_id ON rental_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_subscription_id ON rental_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_reference ON rental_payments(paystack_reference);

-- Enable RLS
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
DROP POLICY IF EXISTS "Users can read own payments" ON rental_payments;
CREATE POLICY "Users can read own payments"
  ON rental_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Block all client writes
DROP POLICY IF EXISTS "Block client writes on payments" ON rental_payments;
CREATE POLICY "Block client writes on payments"
  ON rental_payments
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client updates on payments" ON rental_payments;
CREATE POLICY "Block client updates on payments"
  ON rental_payments
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Admins can read all payments
DROP POLICY IF EXISTS "Admins can read all payments" ON rental_payments;
CREATE POLICY "Admins can read all payments"
  ON rental_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );
```

---

## 8. Verify Final State

```sql
-- Check all rental tables
SELECT
  'rental_plans' as table_name,
  (SELECT COUNT(*) FROM rental_plans) as row_count,
  (SELECT COUNT(*) FROM rental_plans WHERE is_active = true) as active_count
UNION ALL
SELECT
  'rental_subscriptions',
  (SELECT COUNT(*) FROM rental_subscriptions),
  (SELECT COUNT(*) FROM rental_subscriptions WHERE status = 'active')
UNION ALL
SELECT
  'rental_subscription_books',
  (SELECT COUNT(*) FROM rental_subscription_books),
  0
UNION ALL
SELECT
  'rental_payments',
  (SELECT COUNT(*) FROM rental_payments),
  0;

-- Verify plans specifically
SELECT id, name, price_naira, books_per_cycle, swap_frequency FROM rental_plans ORDER BY sort_order;
```

---

## Notes

- The `rental_books` table should already exist from Phase 1
- If `rental_books.price` column exists, it's now unused (books have no individual prices in plan model)
- Old `cart_items`, `rental_orders`, `rental_order_items` tables are left intact for historical data
