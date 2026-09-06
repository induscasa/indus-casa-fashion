create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique,
  order_date_time timestamptz not null,
  customer_full_name text not null check (char_length(customer_full_name) between 2 and 120),
  customer_email text not null check (customer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  customer_phone text not null check (customer_phone ~ '^\\+?[0-9][0-9 -]{9,14}$'),
  delivery_address text not null check (char_length(delivery_address) between 5 and 500),
  delivery_city text not null check (char_length(delivery_city) between 2 and 100),
  delivery_state text not null check (char_length(delivery_state) between 2 and 100),
  delivery_pin text not null check (delivery_pin ~ '^[1-9][0-9]{5}$'),
  ordered_products jsonb not null check (jsonb_typeof(ordered_products) = 'array'),
  order_total numeric(12,2) not null check (order_total >= 0),
  payment_method text not null check (payment_method in ('UPI', 'Cash on Delivery', 'Bank Transfer')),
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'COD', 'Paid', 'Failed', 'Refunded')),
  order_status text not null default 'New' check (order_status in ('New', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.orders enable row level security;

revoke all on table public.orders from anon, authenticated;
grant insert on table public.orders to anon, authenticated;

drop policy if exists "Public customers can create valid orders" on public.orders;
create policy "Public customers can create valid orders"
on public.orders
for insert
to anon, authenticated
with check (
  order_status = 'New'
  and payment_status in ('Pending', 'COD')
  and jsonb_array_length(ordered_products) > 0
);

-- There is intentionally no public SELECT, UPDATE, or DELETE policy.
-- A future authenticated admin service can use a controlled server-side role.
