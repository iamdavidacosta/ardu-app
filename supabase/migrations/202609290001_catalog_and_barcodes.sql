begin;

create table public.catalog_products (
    code text primary key check (char_length(code) between 1 and 64),
    product_name text,
    quantity text
);

alter table public.catalog_products enable row level security;

create policy catalog_products_read_authenticated
on public.catalog_products for select to authenticated
using (true);

revoke all on table public.catalog_products from public, anon, authenticated;
grant select on table public.catalog_products to authenticated;

alter table public.products
add column barcode text check (barcode is null or char_length(barcode) between 1 and 64);

create unique index products_user_barcode_unique
on public.products (user_id, barcode)
where barcode is not null;

grant insert (barcode) on table public.products to authenticated;
grant update (barcode) on table public.products to authenticated;

commit;
