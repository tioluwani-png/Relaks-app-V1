# Rental Phase 2 Database Tables

Run these SQL blocks in order in the Supabase SQL Editor.

---

## 1. Create swap_frequency enum type

```sql
-- Create enum for swap frequency
CREATE TYPE swap_frequency AS ENUM ('monthly', 'end_of_term');
```

---

## 2. Create rental_subscription_status enum type

```sql
-- Create enum for subscription status
CREATE TYPE rental_subscription_status AS ENUM (
  'pending_payment',
  'active',
  'awaiting_return',
  'completed',
  'cancelled'
);
```

---

## 3. Create rental_plans table

```sql
-- Rental plans table
CREATE TABLE rental_plans (
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

## 4. Seed rental_plans

```sql
-- Seed the two plans
INSERT INTO rental_plans (name, description, books_per_cycle, duration_days, price_naira, swap_frequency, sort_order)
VALUES
  ('Monthly', '2 books every month, delivered and swapped at your door', 2, 30, 14000, 'monthly', 1),
  ('Quarterly', '5 books for 3 months, delivered together', 5, 90, 28500, 'end_of_term', 2);
```

---

## 5. Create rental_subscriptions table

```sql
-- Rental subscriptions table
CREATE TABLE rental_subscriptions (
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

-- Create index for user lookups
CREATE INDEX idx_rental_subscriptions_user_id ON rental_subscriptions(user_id);
CREATE INDEX idx_rental_subscriptions_status ON rental_subscriptions(status);

-- Enable RLS
ALTER TABLE rental_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON rental_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Block all client INSERT/UPDATE - server-side service role only
CREATE POLICY "Block client writes"
  ON rental_subscriptions
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block client updates"
  ON rental_subscriptions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Admins have full access
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

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rental_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rental_subscriptions_updated_at
  BEFORE UPDATE ON rental_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_subscriptions_updated_at();
```

---

## 6. Create rental_subscription_books table

```sql
-- Rental subscription books (junction table)
CREATE TABLE rental_subscription_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES rental_subscriptions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES rental_books(id),
  returned BOOLEAN DEFAULT false,
  returned_at TIMESTAMPTZ,
  UNIQUE(subscription_id, book_id)
);

-- Create index for subscription lookups
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

-- Block all client writes
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

---

## 7. Create rental_payments table

```sql
-- Rental payments table
CREATE TABLE rental_payments (
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

-- Create indexes
CREATE INDEX idx_rental_payments_user_id ON rental_payments(user_id);
CREATE INDEX idx_rental_payments_subscription_id ON rental_payments(subscription_id);
CREATE INDEX idx_rental_payments_reference ON rental_payments(paystack_reference);

-- Enable RLS
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
CREATE POLICY "Users can read own payments"
  ON rental_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Block all client writes
CREATE POLICY "Block client writes on payments"
  ON rental_payments
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Block client updates on payments"
  ON rental_payments
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Admins can read all payments
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

## 8. Add available_copies to rental_books (if not exists)

```sql
-- Add available_copies column to rental_books if it doesn't exist
-- This tracks how many copies are available for rental
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_books' AND column_name = 'available_copies'
  ) THEN
    ALTER TABLE rental_books ADD COLUMN available_copies INT DEFAULT 1;
  END IF;
END $$;
```

---

## 9. Verification Query

Run this to verify all tables were created correctly:

```sql
-- Verify tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('rental_plans', 'rental_subscriptions', 'rental_subscription_books', 'rental_payments')
ORDER BY table_name;

-- Verify rental plans seeded
SELECT id, name, books_per_cycle, duration_days, price_naira, swap_frequency FROM rental_plans;

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('rental_plans', 'rental_subscriptions', 'rental_subscription_books', 'rental_payments');
```

---

## Notes

- All client writes are blocked on subscriptions, subscription_books, and payments tables
- Only service role (server-side) can insert/update these tables
- This ensures payment integrity - users cannot manipulate subscription status
- The `paystack_reference` unique constraint prevents duplicate payment processing
