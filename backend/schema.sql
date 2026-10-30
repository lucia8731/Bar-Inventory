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

-- Operations workspace: existing user_id remains the bar owner's stable scope.
alter table app_users add column if not exists bar_timezone text not null default 'Asia/Tokyo';
alter table app_users add column if not exists day_start integer not null default 4 check(day_start between 0 and 12);
alter table sales add column if not exists material_cost_per_unit numeric check(material_cost_per_unit >= 0);
create table if not exists bar_members (
 owner_id uuid not null references app_users(id) on delete cascade,
 member_id uuid not null references app_users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(owner_id,member_id),check(owner_id<>member_id)
);
create table if not exists bar_invites (
 id uuid primary key,owner_id uuid not null references app_users(id) on delete cascade,
 email text not null,expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists audit_events (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 actor_id uuid references app_users(id) on delete set null,action text not null,
 created_at timestamptz not null default now()
);
create index if not exists audit_user_time on audit_events(user_id,created_at desc);
create table if not exists operation_requests (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 kind text not null,request_hash text not null,created_at timestamptz not null default now()
);
create table if not exists stocktakes (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 actor_id uuid references app_users(id) on delete set null,note text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists stocktake_lines (
 id bigint generated always as identity primary key,stocktake_id uuid not null references stocktakes(id) on delete cascade,
 item_name text not null,unit text not null,expected numeric not null,actual numeric not null,
 cost_variance numeric
);
create table if not exists waste_events (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 actor_id uuid references app_users(id) on delete set null,
 inventory_id uuid references inventory(id) on delete set null,item_name text not null,unit text not null,
 amount numeric not null check(amount>0),reason text not null,note text not null default '',
 material_cost numeric,occurred_at timestamptz not null,created_at timestamptz not null default now()
);
create index if not exists waste_user_time on waste_events(user_id,occurred_at desc);
create table if not exists suppliers (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 name text not null,contact text not null default '',email text not null default '',phone text not null default '',
 lead_days integer not null default 0 check(lead_days between 0 and 365),note text not null default ''
);
create table if not exists purchase_orders (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 supplier_id uuid references suppliers(id) on delete set null,supplier_name text not null,
 status text not null default 'draft' check(status in ('draft','ordered','partial','received','cancelled')),
 expected_date date,note text not null default '',created_at timestamptz not null default now(),ordered_at timestamptz
);
create table if not exists purchase_order_lines (
 id uuid primary key,order_id uuid not null references purchase_orders(id) on delete cascade,
 inventory_id uuid references inventory(id) on delete set null,item_name text not null,unit text not null,
 bottle_size numeric not null check(bottle_size>0),bottles numeric not null check(bottles>0),
 received_bottles numeric not null default 0 check(received_bottles>=0 and received_bottles<=bottles),
 unit_price integer check(unit_price>=0)
);
create table if not exists purchase_receipts (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 order_id uuid not null references purchase_orders(id),actor_id uuid references app_users(id),
 lines jsonb not null,created_at timestamptz not null default now()
);
create table if not exists day_closures (
 id uuid primary key,user_id uuid not null references app_users(id) on delete cascade,
 actor_id uuid references app_users(id),business_date date not null,snapshot jsonb not null,
 opening_cash numeric not null check(opening_cash>=0),actual_cash numeric not null check(actual_cash>=0),
 note text not null default '',closed_at timestamptz not null default now(),
 reopened_at timestamptz,reopen_reason text
);
create unique index if not exists one_active_day_close on day_closures(user_id,business_date) where reopened_at is null;
