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
