\set ON_ERROR_STOP on
create schema auth;
create table auth.users (id uuid primary key);
create role authenticated nologin;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
\ir ../supabase/schema.sql
\ir ../supabase/seed.sql
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
insert into public.inventory (id, name, category, unit, quantity) values
('10000000-0000-0000-0000-000000000001', 'Gin', 'Gin', 'ml', 100),
('10000000-0000-0000-0000-000000000002', 'Vermouth', 'Vermouth', 'ml', 25);
insert into public.cocktails (id, name) values ('20000000-0000-0000-0000-000000000001', 'Martini');
insert into public.recipe_ingredients (cocktail_id, inventory_id, amount) values
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 50),
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 20);
select public.make_cocktail('20000000-0000-0000-0000-000000000001');
do $$ begin
 if (select quantity from public.inventory where name='Gin') <> 50 or (select quantity from public.inventory where name='Vermouth') <> 5 then raise exception 'Incorrect deduction'; end if;
 begin
   perform public.make_cocktail('20000000-0000-0000-0000-000000000001');
   raise exception 'Expected insufficient stock';
 exception when raise_exception then
   if sqlerrm not like 'Insufficient stock:%' then raise; end if;
 end;
 if (select quantity from public.inventory where name='Gin') <> 50 or (select quantity from public.inventory where name='Vermouth') <> 5 then raise exception 'Failed operation changed stock'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
do $$ begin
 if exists(select 1 from public.inventory) or exists(select 1 from public.cocktails) or exists(select 1 from public.recipe_ingredients) then raise exception 'RLS exposed another user data'; end if;
 begin
  perform public.make_cocktail('20000000-0000-0000-0000-000000000001');
  raise exception 'Expected inaccessible cocktail';
 exception when raise_exception then
  if sqlerrm <> 'Cocktail not found' then raise; end if;
 end;
 if (select count(*) from public.catalog) < 200 then raise exception 'Catalog is incomplete'; end if;
end $$;
