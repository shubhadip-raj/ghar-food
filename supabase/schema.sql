-- ============================================================
--  Ghar.food – Supabase Database Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CHEFS
-- ────────────────────────────────────────────────────────────
create table if not exists public.chefs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null unique,
  phone            text not null,
  password_hash    text not null,
  address          text not null,
  bio              text,
  place_of_origin  text,
  recipe_list      text,
  photo_url        text,
  kitchen_photo_url text,
  payment_qr_url   text,
  payment_phone    text,
  lat              double precision default 19.076,
  lng              double precision default 72.877,
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected')),
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. MENUS (daily dishes posted by chefs)
-- ────────────────────────────────────────────────────────────
create table if not exists public.menus (
  id            uuid primary key default gen_random_uuid(),
  chef_id       uuid not null references public.chefs(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(8,2) not null,
  meal_type     text not null check (meal_type in ('lunch','dinner')),
  photo_url     text,
  date          date not null default current_date,
  is_available  boolean not null default true,
  orders_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  unique(chef_id, date, meal_type)
);

-- ────────────────────────────────────────────────────────────
-- 3. ORDERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  menu_id          uuid not null references public.menus(id) on delete restrict,
  chef_id          uuid not null references public.chefs(id) on delete restrict,
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text not null,
  amount           numeric(8,2) not null,
  status           text not null default 'confirmed'
                     check (status in ('confirmed','cancelled')),
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 4. ADMIN SETTINGS  (key-value store)
-- ────────────────────────────────────────────────────────────
create table if not exists public.admin_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Seed default settings (safe to re-run)
insert into public.admin_settings (key, value) values
  ('max_orders',  '10'),
  ('tagline',     'Home-cooked goodness, delivered with love'),
  ('admin_email', 'adam@ghar.food')
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────
-- 5. ROW-LEVEL SECURITY  (enable but keep open via service role)
-- ────────────────────────────────────────────────────────────
alter table public.chefs          enable row level security;
alter table public.menus          enable row level security;
alter table public.orders         enable row level security;
alter table public.admin_settings enable row level security;

-- Service-role key bypasses RLS, so these policies are for the
-- anon key (public read only where appropriate)

-- Visitors can read approved chefs
create policy "public read approved chefs"
  on public.chefs for select
  using (status = 'approved');

-- Visitors can read today's available menus
create policy "public read available menus"
  on public.menus for select
  using (is_available = true);

-- All inserts/updates done via service-role key in API routes
-- (no anon write policies needed)

-- ────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKETS
--    Create these in: Storage → New Bucket
-- ────────────────────────────────────────────────────────────
-- Bucket names (all public):
--   chef-photos
--   kitchen-photos
--   payment-qr
--   menu-photos
--
-- Policy for each bucket – allow public read:
--   CREATE POLICY "public read" ON storage.objects FOR SELECT USING (bucket_id = '<bucket-name>');
-- Allow authenticated upload (via service key in API routes – no extra policy needed)

-- ────────────────────────────────────────────────────────────
-- 7. UPDATES FOR v1.1 (run only if upgrading from v1.0)
-- ────────────────────────────────────────────────────────────

-- Widen the order status enum to support chef workflow (fix #5)
-- If you already ran the schema above, run just this block:
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
    CHECK (status IN ('confirmed','payment_received','shipped','cancelled'));
