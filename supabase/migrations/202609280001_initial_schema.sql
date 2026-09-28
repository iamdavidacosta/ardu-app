begin;

create table public.stores (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 80),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, user_id)
);

create unique index stores_user_name_unique
    on public.stores (user_id, lower(name));

create table public.products (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 120),
    presentation_quantity numeric(12, 3) not null check (presentation_quantity > 0),
    presentation_unit text not null check (presentation_unit in ('g', 'kg', 'ml', 'L', 'unidades')),
    category text check (category is null or char_length(btrim(category)) between 1 and 80),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, user_id)
);

create unique index products_user_presentation_unique
    on public.products (user_id, lower(name), presentation_quantity, presentation_unit);

create index products_user_active_name_idx
    on public.products (user_id, active, name);

create table public.shopping_trips (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    store_id uuid not null,
    shopping_date date not null default current_date,
    status text not null default 'draft' check (status in ('draft', 'completed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, user_id),
    constraint shopping_trips_store_owner_fk
        foreign key (store_id, user_id) references public.stores (id, user_id) on delete restrict
);

create unique index shopping_trips_one_draft_per_user
    on public.shopping_trips (user_id)
    where status = 'draft';

create index shopping_trips_user_status_date_idx
    on public.shopping_trips (user_id, status, shopping_date desc);

create index shopping_trips_user_store_date_idx
    on public.shopping_trips (user_id, store_id, shopping_date desc);

create table public.shopping_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    shopping_trip_id uuid not null,
    product_id uuid not null,
    product_name_snapshot text not null,
    presentation_quantity_snapshot numeric(12, 3) not null,
    presentation_unit_snapshot text not null,
    unit_price numeric(14, 2) not null check (unit_price >= 0),
    quantity_purchased integer not null check (quantity_purchased > 0),
    created_at timestamptz not null default now(),
    constraint shopping_items_trip_owner_fk
        foreign key (shopping_trip_id, user_id)
        references public.shopping_trips (id, user_id) on delete cascade,
    constraint shopping_items_product_owner_fk
        foreign key (product_id, user_id)
        references public.products (id, user_id) on delete restrict,
    unique (shopping_trip_id, product_id)
);

create index shopping_items_user_product_idx
    on public.shopping_items (user_id, product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger shopping_trips_set_updated_at
before update on public.shopping_trips
for each row execute function public.set_updated_at();

create or replace function public.set_shopping_item_product_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    select product.name, product.presentation_quantity, product.presentation_unit
    into new.product_name_snapshot, new.presentation_quantity_snapshot, new.presentation_unit_snapshot
    from public.products product
    where product.id = new.product_id
      and product.user_id = new.user_id
      and product.active;

    if not found then
        raise exception 'Product not found or inactive' using errcode = '23503';
    end if;

    return new;
end;
$$;

create trigger shopping_items_set_product_snapshot
before insert on public.shopping_items
for each row execute function public.set_shopping_item_product_snapshot();

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.shopping_trips enable row level security;
alter table public.shopping_items enable row level security;

create policy stores_select_own
on public.stores for select to authenticated
using ((select auth.uid()) = user_id);

create policy stores_insert_own
on public.stores for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy stores_update_own
on public.stores for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy stores_delete_own
on public.stores for delete to authenticated
using ((select auth.uid()) = user_id);

create policy products_select_own
on public.products for select to authenticated
using ((select auth.uid()) = user_id);

create policy products_insert_own
on public.products for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy products_update_own
on public.products for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy products_delete_own
on public.products for delete to authenticated
using ((select auth.uid()) = user_id);

create policy shopping_trips_select_own
on public.shopping_trips for select to authenticated
using ((select auth.uid()) = user_id);

create policy shopping_trips_insert_own
on public.shopping_trips for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'draft');

create policy shopping_trips_update_own_draft
on public.shopping_trips for update to authenticated
using ((select auth.uid()) = user_id and status = 'draft')
with check ((select auth.uid()) = user_id);

create policy shopping_trips_delete_own_draft
on public.shopping_trips for delete to authenticated
using ((select auth.uid()) = user_id and status = 'draft');

create policy shopping_items_select_own
on public.shopping_items for select to authenticated
using ((select auth.uid()) = user_id);

create policy shopping_items_insert_own_draft
on public.shopping_items for insert to authenticated
with check (
    (select auth.uid()) = user_id
    and exists (
        select 1
        from public.shopping_trips trip
        where trip.id = shopping_trip_id
          and trip.user_id = (select auth.uid())
          and trip.status = 'draft'
    )
);

create policy shopping_items_update_own_draft
on public.shopping_items for update to authenticated
using (
    (select auth.uid()) = user_id
    and exists (
        select 1
        from public.shopping_trips trip
        where trip.id = shopping_trip_id
          and trip.user_id = (select auth.uid())
          and trip.status = 'draft'
    )
)
with check (
    (select auth.uid()) = user_id
    and exists (
        select 1
        from public.shopping_trips trip
        where trip.id = shopping_trip_id
          and trip.user_id = (select auth.uid())
          and trip.status = 'draft'
    )
);

create policy shopping_items_delete_own_draft
on public.shopping_items for delete to authenticated
using (
    (select auth.uid()) = user_id
    and exists (
        select 1
        from public.shopping_trips trip
        where trip.id = shopping_trip_id
          and trip.user_id = (select auth.uid())
          and trip.status = 'draft'
    )
);

create view public.shopping_trip_summaries
with (security_invoker = true)
as
select
    trip.id,
    trip.user_id,
    trip.store_id,
    store.name as store_name,
    trip.shopping_date,
    trip.status,
    trip.created_at,
    trip.updated_at,
    coalesce(sum(item.unit_price * item.quantity_purchased), 0)::numeric(14, 2) as total,
    coalesce(sum(item.quantity_purchased), 0)::bigint as product_count
from public.shopping_trips trip
join public.stores store
  on store.id = trip.store_id
 and store.user_id = trip.user_id
left join public.shopping_items item
  on item.shopping_trip_id = trip.id
 and item.user_id = trip.user_id
group by trip.id, store.name;

create view public.product_price_history
with (security_invoker = true)
as
select
    item.id as shopping_item_id,
    item.user_id,
    item.product_id,
    item.shopping_trip_id,
    trip.store_id,
    store.name as store_name,
    trip.shopping_date,
    trip.updated_at as completed_at,
    item.unit_price,
    item.quantity_purchased
from public.shopping_items item
join public.shopping_trips trip
  on trip.id = item.shopping_trip_id
 and trip.user_id = item.user_id
join public.stores store
  on store.id = trip.store_id
 and store.user_id = trip.user_id
where trip.status = 'completed';

create or replace function public.ensure_initial_stores()
returns setof public.stores
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception 'Authentication required' using errcode = '42501';
    end if;

    insert into public.stores (user_id, name)
    select current_user_id, seed.name
    from unnest(array['D1', 'Ara', 'Éxito', 'Olímpica', 'Carulla', 'Ísimo']::text[]) as seed(name)
    on conflict do nothing;

    return query
    select store.*
    from public.stores store
    where store.user_id = current_user_id
    order by store.name;
end;
$$;

create or replace function public.finalize_shopping_trip(p_shopping_trip_id uuid)
returns table (trip_id uuid, trip_status text, trip_updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    current_status text;
begin
    if current_user_id is null then
        raise exception 'Authentication required' using errcode = '42501';
    end if;

    select trip.status
    into current_status
    from public.shopping_trips trip
    where trip.id = p_shopping_trip_id
      and trip.user_id = current_user_id
    for update;

    if not found then
        raise exception 'Shopping trip not found' using errcode = 'P0002';
    end if;

    if current_status <> 'draft' then
        raise exception 'Shopping trip is already completed' using errcode = 'P0001';
    end if;

    if not exists (
        select 1
        from public.shopping_items item
        where item.shopping_trip_id = p_shopping_trip_id
          and item.user_id = current_user_id
    ) then
        raise exception 'Cannot complete an empty shopping trip' using errcode = '23514';
    end if;

    perform 1
    from public.shopping_items item
    where item.shopping_trip_id = p_shopping_trip_id
      and item.user_id = current_user_id
    for update;

    return query
    update public.shopping_trips trip
    set status = 'completed'
    where trip.id = p_shopping_trip_id
      and trip.user_id = current_user_id
    returning trip.id, trip.status, trip.updated_at;
end;
$$;

revoke all on table public.stores from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.shopping_trips from anon, authenticated;
revoke all on table public.shopping_items from anon, authenticated;

grant select on table public.stores to authenticated;
grant insert (user_id, name) on table public.stores to authenticated;
grant update (name) on table public.stores to authenticated;
grant delete on table public.stores to authenticated;

grant select on table public.products to authenticated;
grant insert (user_id, name, presentation_quantity, presentation_unit, category, active)
    on table public.products to authenticated;
grant update (name, presentation_quantity, presentation_unit, category, active)
    on table public.products to authenticated;
grant delete on table public.products to authenticated;

grant select on table public.shopping_trips to authenticated;
grant insert (user_id, store_id, shopping_date)
    on table public.shopping_trips to authenticated;
grant update (store_id, shopping_date)
    on table public.shopping_trips to authenticated;
grant delete on table public.shopping_trips to authenticated;

grant select on table public.shopping_items to authenticated;
grant insert (user_id, shopping_trip_id, product_id, unit_price, quantity_purchased)
    on table public.shopping_items to authenticated;
grant update (unit_price, quantity_purchased)
    on table public.shopping_items to authenticated;
grant delete on table public.shopping_items to authenticated;

revoke all on table public.shopping_trip_summaries from anon, authenticated;
revoke all on table public.product_price_history from anon, authenticated;
grant select on table public.shopping_trip_summaries to authenticated;
grant select on table public.product_price_history to authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_shopping_item_product_snapshot() from public;
revoke all on function public.ensure_initial_stores() from public;
revoke all on function public.finalize_shopping_trip(uuid) from public;
grant execute on function public.ensure_initial_stores() to authenticated;
grant execute on function public.finalize_shopping_trip(uuid) to authenticated;

commit;
