# Relaks Shop SQL Migration

Run these SQL statements in Supabase SQL Editor **one block at a time**, in order.

---

## Table 1: shop_products

```sql
CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_naira INTEGER NOT NULL CHECK (price_naira >= 0),
  compare_at_price_naira INTEGER CHECK (compare_at_price_naira IS NULL OR compare_at_price_naira >= 0),
  product_type TEXT NOT NULL DEFAULT 'other' CHECK (product_type IN ('book', 'stationery', 'combo', 'other')),
  edition TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shop_products_slug ON shop_products(slug);
CREATE INDEX idx_shop_products_active ON shop_products(is_active) WHERE is_active = true;
CREATE INDEX idx_shop_products_type ON shop_products(product_type);

-- RLS
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

-- Public can read active products
CREATE POLICY "Public can view active products"
ON shop_products FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage products"
ON shop_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);
```

---

## Table 2: shop_delivery_zones

```sql
CREATE TABLE shop_delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lgas TEXT[] NOT NULL DEFAULT '{}',
  fee_naira INTEGER NOT NULL CHECK (fee_naira >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE shop_delivery_zones ENABLE ROW LEVEL SECURITY;

-- Public can read active zones
CREATE POLICY "Public can view active zones"
ON shop_delivery_zones FOR SELECT
USING (is_active = true);

-- Admins can manage
CREATE POLICY "Admins can manage zones"
ON shop_delivery_zones FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Seed delivery zones
-- TODO: Akeju to adjust LGA groupings and fees
INSERT INTO shop_delivery_zones (name, lgas, fee_naira) VALUES
('Island / Lekki', ARRAY['Eti-Osa', 'Lagos Island', 'Ibeju-Lekki'], 2000),
('Mainland Central', ARRAY['Ikeja', 'Lagos Mainland', 'Surulere', 'Mushin', 'Oshodi-Isolo', 'Kosofe'], 3000),
('Mainland Outer', ARRAY['Agege', 'Ifako-Ijaiye', 'Alimosho', 'Ajeromi-Ifelodun', 'Amuwo-Odofin', 'Apapa', 'Shomolu'], 4000),
('Outskirts', ARRAY['Badagry', 'Epe', 'Ikorodu', 'Ojo'], 5000);
```

---

## Table 3: shop_orders

```sql
CREATE TABLE shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_lga TEXT NOT NULL,
  delivery_zone_id UUID REFERENCES shop_delivery_zones(id),
  delivery_address TEXT NOT NULL,
  delivery_fee_naira INTEGER NOT NULL CHECK (delivery_fee_naira >= 0),
  subtotal_naira INTEGER NOT NULL CHECK (subtotal_naira >= 0),
  total_naira INTEGER NOT NULL CHECK (total_naira >= 0),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled')),
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shop_orders_user ON shop_orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_shop_orders_status ON shop_orders(status);
CREATE INDEX idx_shop_orders_number ON shop_orders(order_number);

-- RLS
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON shop_orders FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Server-side inserts/updates (no direct client writes)
CREATE POLICY "Admins can manage orders"
ON shop_orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);
```

---

## Table 4: shop_order_items

```sql
CREATE TABLE shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES shop_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price_naira INTEGER NOT NULL CHECK (unit_price_naira >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shop_order_items_order ON shop_order_items(order_id);

-- RLS
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

-- Follow parent order access
CREATE POLICY "Users can view own order items"
ON shop_order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shop_orders
    WHERE shop_orders.id = shop_order_items.order_id
    AND (
      shop_orders.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Admins can manage
CREATE POLICY "Admins can manage order items"
ON shop_order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);
```

---

## Table 5: shop_payments

```sql
CREATE TABLE shop_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  amount_naira INTEGER NOT NULL CHECK (amount_naira >= 0),
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shop_payments_order ON shop_payments(order_id);
CREATE INDEX idx_shop_payments_reference ON shop_payments(paystack_reference);

-- RLS
ALTER TABLE shop_payments ENABLE ROW LEVEL SECURITY;

-- Users can view payments for their orders
CREATE POLICY "Users can view own payments"
ON shop_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shop_orders
    WHERE shop_orders.id = shop_payments.order_id
    AND (
      shop_orders.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
      )
    )
  )
);

-- Admins can manage
CREATE POLICY "Admins can manage payments"
ON shop_payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);
```

---

## Verification Queries

Run these to confirm all tables exist with correct columns:

```sql
-- Check shop_products
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shop_products'
ORDER BY ordinal_position;

-- Check shop_delivery_zones (should have 4 rows from seed)
SELECT * FROM shop_delivery_zones ORDER BY fee_naira;

-- Check shop_orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shop_orders'
ORDER BY ordinal_position;

-- Check shop_order_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shop_order_items'
ORDER BY ordinal_position;

-- Check shop_payments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shop_payments'
ORDER BY ordinal_position;
```

---

## Rollback (if needed)

```sql
-- WARNING: This deletes all shop data
DROP TABLE IF EXISTS shop_payments CASCADE;
DROP TABLE IF EXISTS shop_order_items CASCADE;
DROP TABLE IF EXISTS shop_orders CASCADE;
DROP TABLE IF EXISTS shop_delivery_zones CASCADE;
DROP TABLE IF EXISTS shop_products CASCADE;
```
