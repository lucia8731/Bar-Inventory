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
