create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can view their own membership" on public.admin_users;
create policy "Admins can view their own membership"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id and role = 'admin');

revoke update on table public.orders from authenticated;
grant select on table public.orders to authenticated;
grant update (order_status, payment_status) on table public.orders to authenticated;

drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "Admins can update order statuses" on public.orders;
create policy "Admins can update order statuses"
on public.orders
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Add admin_users rows only from a trusted Supabase SQL session or server-side tool.
-- Never expose a service-role key or admin provisioning capability to the browser.
