create table if not exists app_users (
  id uuid primary key,
  google_sub text not null unique,
  email text not null,
  display_name text not null default ''
);
create table if not exists catalog (
  id bigint generated always as identity primary key,
  name text not null unique,
  category text not null,
  unit text not null check (unit in ('ml', 'piece'))
);
create table if not exists inventory (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  unit text not null check (unit in ('ml', 'piece')),
  quantity numeric not null default 0 check (quantity >= 0),
  low_stock_threshold numeric not null default 0 check (low_stock_threshold >= 0),
  unique (id, user_id), unique (user_id, name)
);
create table if not exists cocktails (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  unique (id, user_id), unique (user_id, name)
);
create table if not exists recipe_ingredients (
  user_id uuid not null references app_users(id) on delete cascade,
  cocktail_id uuid not null,
  inventory_id uuid not null,
  amount numeric not null check (amount > 0),
  primary key (cocktail_id, inventory_id),
  foreign key (cocktail_id, user_id) references cocktails(id, user_id) on delete cascade,
  foreign key (inventory_id, user_id) references inventory(id, user_id) on delete restrict
);

-- Additive changes preserve all existing users, inventory and recipes.
alter table inventory add column if not exists target_stock numeric not null default 0 check (target_stock >= 0);
alter table inventory add column if not exists supplier text not null default '';
create table if not exists stock_events (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  item_name text not null,
  unit text not null,
  change numeric not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists stock_events_user_time on stock_events (user_id, created_at desc);
alter table inventory add column if not exists image_url text not null default '';

-- Nullable until one-time backfill; a user's later selections are never overwritten.
alter table catalog add column if not exists container_shape text;
alter table catalog add column if not exists container_color text;
alter table inventory add column if not exists container_shape text;
alter table inventory add column if not exists container_color text;

-- Small profile photos persist with the user's database record.
alter table app_users add column if not exists avatar_data bytea;
alter table app_users add column if not exists avatar_version uuid;

alter table cocktails add column if not exists glass_shape text not null default 'coupe';
alter table cocktails add column if not exists glass_color text not null default 'gold';
create table if not exists sales (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  cocktail_id uuid references cocktails(id) on delete set null,
  item_name text not null,
  quantity integer not null check(quantity between 1 and 1000),
  unit_price integer not null check(unit_price between 0 and 10000000),
  sold_at timestamptz not null,
  payment_method text not null check(payment_method in ('cash','card','other')),
  note text not null default '',
  stock_deducted boolean not null,
  request_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists sales_user_date on sales(user_id,sold_at desc);

alter table cocktails add column if not exists price integer check(price between 0 and 10000000);

alter table inventory add column if not exists purchase_price integer check(purchase_price between 0 and 10000000);

alter table inventory add column if not exists bottle_size numeric check(bottle_size > 0);

alter table app_users add column if not exists bar_name text not null default '';
alter table app_users add column if not exists bar_logo_data bytea;
alter table app_users add column if not exists bar_logo_version uuid;

-- Saved quick-sale favorites and durable idempotency for complete sale batches.
alter table cocktails add column if not exists sales_pinned boolean not null default false;
create table if not exists sale_batches (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  request_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists restock_batches (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  request_hash text not null,
  created_at timestamptz not null default now()
);

alter table app_users add column if not exists preferred_unit text not null default 'ml' check(preferred_unit in ('ml','oz'));
alter table recipe_ingredients add column if not exists amount_unit text check(amount_unit in ('ml','oz','drop','dash','piece'));
