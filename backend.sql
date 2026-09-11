-- KoopRader production database schema (PostgreSQL / Supabase)
create extension if not exists pgcrypto;

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domain text,
  affiliate_url_template text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  ean text unique,
  sku text,
  brand text,
  name text not null,
  category text,
  image_url text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2),
  shipping_cost numeric(12,2) not null default 0 check (shipping_cost >= 0),
  stock_status text,
  product_url text not null,
  image_url text,
  last_checked_at timestamptz not null default now(),
  active boolean not null default true,
  unique(product_id, shop_id)
);

create table if not exists price_history (
  id bigserial primary key,
  offer_id uuid not null references offers(id) on delete cascade,
  price numeric(12,2) not null,
  shipping_cost numeric(12,2) not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists products_name_idx on products using gin (to_tsvector('simple', name));
create index if not exists offers_product_idx on offers(product_id);
create index if not exists offers_shop_idx on offers(shop_id);
create index if not exists history_offer_time_idx on price_history(offer_id, recorded_at desc);

create or replace view product_comparison as
select p.id, p.ean, p.name, p.brand, p.category, p.image_url,
       min(o.price + o.shipping_cost) as lowest_total_price,
       count(o.id) as shop_count,
       max(o.last_checked_at) as last_updated
from products p
join offers o on o.product_id=p.id and o.active=true
where p.active=true
group by p.id;

-- RLS can be enabled when the Supabase project is connected. Public read access
-- should expose only safe product/offer fields; ingestion remains server-side.
