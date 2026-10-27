-- Run in the Supabase SQL editor on a new project. Amounts use the same unit
-- for inventory and recipe ingredients (for example, ml or pieces).
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default ''
);
create table public.catalog (
  id bigint generated always as identity primary key,
  name text not null unique,
  category text not null,
  unit text not null check (unit in ('ml', 'piece'))
);
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  category text not null,
  unit text not null check (unit in ('ml', 'piece')),
  quantity numeric not null default 0 check (quantity >= 0),
  low_stock_threshold numeric not null default 0 check (low_stock_threshold >= 0),
  unique (id, user_id), unique (user_id, name)
);
create table public.cocktails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  unique (id, user_id), unique (user_id, name)
);
create table public.recipe_ingredients (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cocktail_id uuid not null,
  inventory_id uuid not null,
  amount numeric not null check (amount > 0),
  primary key (cocktail_id, inventory_id),
  foreign key (cocktail_id, user_id) references public.cocktails(id, user_id) on delete cascade,
  foreign key (inventory_id, user_id) references public.inventory(id, user_id) on delete restrict
);

alter table public.profiles enable row level security;
alter table public.catalog enable row level security;
alter table public.inventory enable row level security;
alter table public.cocktails enable row level security;
alter table public.recipe_ingredients enable row level security;
create policy "Users manage their own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Authenticated users can read the catalog" on public.catalog for select to authenticated using (true);
create policy "Users manage their own inventory" on public.inventory for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their own cocktails" on public.cocktails for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their own recipes" on public.recipe_ingredients for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Serialize recipe edits with making the same cocktail. Changing a recipe's
-- cocktail is expressed as a delete followed by an insert.
create function public.lock_recipe_cocktail() returns trigger
language plpgsql security invoker set search_path = public as $$
declare parent_id uuid;
begin
  if tg_op = 'UPDATE' and (new.cocktail_id <> old.cocktail_id or new.user_id <> old.user_id) then
    raise exception 'Move recipe ingredients using delete and insert';
  end if;
  if tg_op = 'DELETE' then parent_id := old.cocktail_id; else parent_id := new.cocktail_id; end if;
  perform 1 from public.cocktails where id = parent_id and user_id = auth.uid() for update;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger lock_recipe_cocktail before insert or update or delete on public.recipe_ingredients
for each row execute function public.lock_recipe_cocktail();

-- One database transaction: lock all items in a consistent order, reject the
-- entire operation if any ingredient is insufficient, then deduct together.
create function public.make_cocktail(p_cocktail_id uuid, p_servings integer default 1)
returns void language plpgsql security invoker set search_path = public as $$
declare ingredient record;
begin
  if auth.uid() is null or p_servings is null or p_servings < 1 or p_servings > 1000 then
    raise exception 'Invalid user or servings';
  end if;
  perform 1 from public.cocktails where id = p_cocktail_id and user_id = auth.uid() for update;
  if not found then raise exception 'Cocktail not found'; end if;
  if not exists (select 1 from public.recipe_ingredients where cocktail_id = p_cocktail_id and user_id = auth.uid()) then
    raise exception 'Recipe has no ingredients';
  end if;
  for ingredient in
    select i.id, i.name, i.quantity, r.amount
    from public.recipe_ingredients r join public.inventory i on i.id = r.inventory_id and i.user_id = r.user_id
    where r.cocktail_id = p_cocktail_id and r.user_id = auth.uid()
    order by i.id for update of i
  loop
    if ingredient.quantity < ingredient.amount * p_servings then
      raise exception 'Insufficient stock: %', ingredient.name;
    end if;
  end loop;
  update public.inventory i set quantity = i.quantity - r.amount * p_servings
    from public.recipe_ingredients r
    where r.cocktail_id = p_cocktail_id and r.user_id = auth.uid()
      and i.id = r.inventory_id and i.user_id = r.user_id;
end $$;
revoke all on function public.make_cocktail(uuid, integer) from public;
grant execute on function public.make_cocktail(uuid, integer) to authenticated;
