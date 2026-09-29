begin;

create table public.catalog_product_changes (
    id bigint generated always as identity primary key,
    code text not null,
    changed_by uuid references auth.users(id) on delete set null,
    previous_name text,
    previous_quantity text,
    new_name text,
    new_quantity text,
    changed_at timestamptz not null default now()
);

alter table public.catalog_product_changes enable row level security;
revoke all on table public.catalog_product_changes from public, anon, authenticated;

create function public.log_catalog_product_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    old_name text;
    old_quantity text;
begin
    if tg_op = 'UPDATE' then
        old_name := old.product_name;
        old_quantity := old.quantity;
    end if;
    insert into public.catalog_product_changes (
        code, changed_by, previous_name, previous_quantity, new_name, new_quantity
    ) values (
        new.code, auth.uid(), old_name, old_quantity, new.product_name, new.quantity
    );
    return new;
end;
$$;

revoke all on function public.log_catalog_product_change() from public, anon, authenticated;

create trigger catalog_product_insert_audit
after insert on public.catalog_products
for each row
execute function public.log_catalog_product_change();

create trigger catalog_product_change_audit
after update of product_name, quantity on public.catalog_products
for each row
when (old.product_name is distinct from new.product_name or old.quantity is distinct from new.quantity)
execute function public.log_catalog_product_change();

grant insert (code, product_name, quantity) on table public.catalog_products to authenticated;
grant update (product_name, quantity) on table public.catalog_products to authenticated;

create policy catalog_products_insert_authenticated
on public.catalog_products for insert to authenticated
with check (
    code ~ '^[0-9]{4,32}$'
    and product_name is not null
    and char_length(trim(product_name)) between 1 and 120
    and (quantity is null or char_length(quantity) <= 120)
);

create policy catalog_products_update_authenticated
on public.catalog_products for update to authenticated
using (true)
with check (
    product_name is not null
    and char_length(trim(product_name)) between 1 and 120
    and (quantity is null or char_length(quantity) <= 120)
);

commit;
