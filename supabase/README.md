# Jacket POS – Supabase Schema

## Schema Overview

| Table        | Purpose                                |
|-------------|-----------------------------------------|
| `menu_items` | Product catalog (jacket potato flavors) |
| `orders`     | Order headers (status, payment, location) |
| `order_items`| Line items per order                    |
| `inventory`  | Stock levels (potatoes, flavor toppings) |

## Applying the Migration

### Option 1: Supabase Dashboard (SQL Editor)

1. Open your [Supabase project](https://supabase.com/dashboard/project/bxmorqfuhkuodhoexxpv)
2. Go to **SQL Editor** → **New query**
3. Run migrations in order:
   - `migrations/20250322000000_create_jacket_pos_schema.sql` (initial schema)
   - `migrations/20250323000000_add_order_phase_timestamps.sql` (phase timing)
4. Click **Run** for each

### Option 2: Supabase CLI

```bash
# Link to your project (if not already)
npx supabase link --project-ref bxmorqfuhkuodhoexxpv

# Push migrations
npx supabase db push
```

### Option 3: MCP (Cursor)

1. Ensure Supabase MCP is configured in `.cursor/mcp.json`
2. Authenticate when prompted
3. Ask the AI: "Apply the migration in supabase/migrations/"

## Tables

### menu_items

| Column     | Type   | Description          |
|-----------|--------|----------------------|
| id        | TEXT   | Primary key (e.g. classic-bacon) |
| name      | TEXT   | Display name         |
| price     | INTEGER| Price in ฿           |
| image     | TEXT   | Image URL            |

### orders

| Column        | Type        | Description               |
|---------------|-------------|---------------------------|
| id            | UUID        | Primary key               |
| order_number  | SERIAL      | Human-readable order #    |
| created_at    | TIMESTAMPTZ | Order timestamp           |
| status        | order_status| new → preparing → ready → completed |
| payment_status| payment_status | unpaid, paid, voided, refunded |
| payment_method| payment_method | cash, qr, transfer    |
| total_amount  | INTEGER     | Total in ฿                |
| location      | TEXT        | Sale location             |
| preparing_at  | TIMESTAMPTZ | When order entered Preparing phase |
| ready_at      | TIMESTAMPTZ | When order entered Ready phase     |
| completed_at  | TIMESTAMPTZ | When order was completed           |

### order_items

| Column     | Type   | Description      |
|-----------|--------|------------------|
| id        | UUID   | Primary key      |
| order_id  | UUID   | FK → orders      |
| menu_item_id | TEXT | FK → menu_items  |
| name      | TEXT   | Item name        |
| qty       | INTEGER| Quantity         |
| price     | INTEGER| Unit price in ฿  |

### inventory

| Column               | Type   | Description                    |
|----------------------|--------|--------------------------------|
| potato_stock         | INTEGER| Current potato count           |
| opening_potato_stock | INTEGER| Start-of-day potatoes          |
| flavor_stocks        | JSONB  | `{"classic-bacon": 30, ...}`   |
| opening_flavor_stocks| JSONB  | Same structure                 |
| thresholds           | JSONB  | `{"potato": 15, "flavor": 5}`  |
