# Free Delivery Feature SQL

Run these in Supabase SQL Editor in order.

## 1. Add free delivery columns to shop_sales

```sql
-- Add free delivery columns to shop_sales
ALTER TABLE shop_sales
ADD COLUMN free_delivery boolean NOT NULL DEFAULT false,
ADD COLUMN free_delivery_min_order_naira integer NULL;

-- Drop existing check constraint if it requires discount_percent > 0
-- (The constraint name may vary - check your schema)
ALTER TABLE shop_sales DROP CONSTRAINT IF EXISTS shop_sales_discount_percent_check;

-- Add new constraint: discount_percent must be 0-90, and sale must have discount OR free_delivery
ALTER TABLE shop_sales
ADD CONSTRAINT shop_sales_discount_percent_check CHECK (discount_percent >= 0 AND discount_percent <= 90),
ADD CONSTRAINT shop_sales_has_offer CHECK (discount_percent > 0 OR free_delivery = true);

-- Comment for clarity
COMMENT ON COLUMN shop_sales.free_delivery IS 'Whether this sale includes free delivery within Lagos';
COMMENT ON COLUMN shop_sales.free_delivery_min_order_naira IS 'Minimum order amount for free delivery (null = no minimum)';
```

## 2. Add delivery_fee_waived_naira to shop_orders

```sql
-- Add waived delivery fee tracking to shop_orders
ALTER TABLE shop_orders
ADD COLUMN delivery_fee_waived_naira integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN shop_orders.delivery_fee_waived_naira IS 'Normal delivery fee that was waived due to sale free delivery';
```

## 3. Verify RLS on shop_sales allows public read of live sales

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'shop_sales';

-- If needed, ensure public can read active sales (for shop banner)
-- This should already exist, but if not:
-- CREATE POLICY "Public can read live sales" ON shop_sales
--   FOR SELECT USING (
--     is_active = true
--     AND starts_at <= now()
--     AND ends_at > now()
--   );
```

## Rollback (if needed)

```sql
-- Rollback
ALTER TABLE shop_sales DROP CONSTRAINT IF EXISTS shop_sales_has_offer;
ALTER TABLE shop_sales DROP CONSTRAINT IF EXISTS shop_sales_discount_percent_check;
ALTER TABLE shop_sales DROP COLUMN IF EXISTS free_delivery_min_order_naira;
ALTER TABLE shop_sales DROP COLUMN IF EXISTS free_delivery;
ALTER TABLE shop_orders DROP COLUMN IF EXISTS delivery_fee_waived_naira;
-- Re-add original constraint
ALTER TABLE shop_sales ADD CONSTRAINT shop_sales_discount_percent_check CHECK (discount_percent > 0 AND discount_percent <= 90);
```
