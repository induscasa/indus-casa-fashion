const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const adminSchema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'admin-schema.sql'), 'utf8');
const orderSchema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');

test('Supabase order security keeps customer access insert-only and admin access authenticated', () => {
  expect(orderSchema).toContain('alter table public.orders enable row level security;');
  expect(orderSchema).toContain('grant insert on table public.orders to anon, authenticated;');
  expect(orderSchema).toContain('for insert\nto anon, authenticated');
  expect(adminSchema).toContain('alter table public.admin_users enable row level security;');
  expect(adminSchema).toContain('for select\nto authenticated');
  expect(adminSchema).toContain('grant update (order_status, payment_status) on table public.orders to authenticated;');
  expect(adminSchema).toContain('Admins can view orders');
  expect(adminSchema).toContain('Admins can update order statuses');
  expect(adminSchema).not.toContain('for select\nto anon');
  expect(adminSchema).not.toContain('grant insert on table public.admin_users');
});
