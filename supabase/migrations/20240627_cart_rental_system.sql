-- Cart & Rental System Migration
-- Run this in your Supabase SQL Editor

-- Cart items (temporary storage before checkout)
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Rental orders
CREATE TABLE IF NOT EXISTS rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, processing, shipped, delivered, returned, cancelled
  subtotal INTEGER NOT NULL, -- in kobo
  delivery_fee INTEGER NOT NULL, -- in kobo
  total INTEGER NOT NULL, -- in kobo

  -- Delivery details
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  landmark TEXT,
  delivery_notes TEXT,

  -- Payment
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items (books in an order)
CREATE TABLE IF NOT EXISTS rental_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES rental_orders(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id),
  price INTEGER NOT NULL, -- in kobo (300000 = ₦3,000)
  rental_start_date DATE,
  rental_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_book_id ON cart_items(book_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_id ON rental_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON rental_orders(status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_payment_reference ON rental_orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_rental_order_items_order_id ON rental_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_rental_order_items_book_id ON rental_order_items(book_id);

-- RLS Policies

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_order_items ENABLE ROW LEVEL SECURITY;

-- Cart items policies
CREATE POLICY "Users can view their own cart items"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- Rental orders policies
CREATE POLICY "Users can view their own orders"
  ON rental_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON rental_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders"
  ON rental_orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Order items policies (users can view through their orders)
CREATE POLICY "Users can view their order items"
  ON rental_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rental_orders
      WHERE rental_orders.id = rental_order_items.order_id
      AND rental_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order items for their orders"
  ON rental_order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rental_orders
      WHERE rental_orders.id = rental_order_items.order_id
      AND rental_orders.user_id = auth.uid()
    )
  );

-- Admin policies (admins can view and update all orders)
CREATE POLICY "Admins can view all orders"
  ON rental_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update all orders"
  ON rental_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can view all order items"
  ON rental_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Trigger to update updated_at on rental_orders
CREATE OR REPLACE FUNCTION update_rental_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rental_orders_updated_at
  BEFORE UPDATE ON rental_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_orders_updated_at();
