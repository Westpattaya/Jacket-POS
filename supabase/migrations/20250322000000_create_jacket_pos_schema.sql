-- Jacket POS Schema for Supabase
-- Run this migration in Supabase SQL Editor or via: supabase db push

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE order_status AS ENUM ('new', 'preparing', 'ready', 'completed');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'voided', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'qr', 'transfer');

-- =============================================
-- MENU ITEMS (product catalog)
-- =============================================
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default menu items
INSERT INTO menu_items (id, name, price, image) VALUES
  ('classic-bacon', 'Classic Bacon', 99, '/menu-classic-bacon.png'),
  ('hunter-chicken', 'Hunter Chicken BBQ', 109, '/menu-hunter-chicken.png'),
  ('truffle-mushroom', 'Truffle Mushroom Chicken', 129, '/menu-truffle-mushroom.png');

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number SERIAL UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status order_status NOT NULL DEFAULT 'new',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  payment_method payment_method NOT NULL DEFAULT 'cash',
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  location TEXT
);

-- Index for common queries: list orders by date, filter by status
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX idx_orders_status ON orders (status) WHERE status != 'completed';
CREATE INDEX idx_orders_location ON orders (location) WHERE location IS NOT NULL;

-- =============================================
-- ORDER ITEMS (line items)
-- =============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  name TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  price INTEGER NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

-- =============================================
-- INVENTORY (daily stock tracking)
-- =============================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  potato_stock INTEGER NOT NULL DEFAULT 0 CHECK (potato_stock >= 0),
  opening_potato_stock INTEGER NOT NULL DEFAULT 0,
  flavor_stocks JSONB NOT NULL DEFAULT '{}',
  opening_flavor_stocks JSONB NOT NULL DEFAULT '{}',
  thresholds JSONB NOT NULL DEFAULT '{"potato": 15, "flavor": 5}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single row for current inventory (simplest approach)
INSERT INTO inventory (potato_stock, opening_potato_stock, flavor_stocks, opening_flavor_stocks) VALUES (
  80,
  80,
  '{"classic-bacon": 30, "hunter-chicken": 30, "truffle-mushroom": 20}',
  '{"classic-bacon": 30, "hunter-chicken": 30, "truffle-mushroom": 20}'
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for production; use service role for POS app
-- =============================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon/authenticated (adjust for your auth setup)
-- For POS kiosk, you may use service_role key which bypasses RLS
CREATE POLICY "Allow all for menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- REALTIME (optional - uncomment for live order updates)
-- =============================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
