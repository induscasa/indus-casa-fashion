# Supabase order storage

This project is a static GitHub Pages site, so it has no private server runtime. The optional order adapter uses the Supabase REST API with the public anon/publishable key and relies on database constraints and RLS.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Run `supabase/admin-schema.sql` after `schema.sql`.
4. Edit `supabase-config.js` with the project URL and public anon/publishable key:

```js
window.INDUS_CASA_SUPABASE = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
};
```

Use only the public anon/publishable key. Never put a service-role key, database password, SMTP password, or other secret in this file or in frontend code.

## Security model

The `orders` table accepts validated inserts for checkout, including only `New` orders and `Pending` or `COD` payment status. There is no public read, update, or delete policy, so customers cannot read other customers' orders. A future admin dashboard should use authenticated server-side access and its own RLS policies.

## Admin foundation

There is no public admin dashboard in this static site. Enable Supabase Auth, create an admin user in the Supabase dashboard, then add that user's Auth UUID to `public.admin_users` from a trusted Supabase SQL session. The admin migration grants authenticated admin members read access to orders and limits writes to `order_status` and `payment_status`. It does not grant public access or expose an admin password in the frontend.

Supported order statuses are `New`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, and `Cancelled`. Supported payment statuses are `Pending`, `COD`, `Paid`, `Failed`, and `Refunded`.

Until both values are configured, the storefront keeps its existing confirmation and email notification flow and does not attempt a database request. The email recipient remains `induscasafashion@gmail.com`.

## Customer accounts

The storefront uses Supabase Auth email/password endpoints with the same public key. Rerun `supabase/schema.sql` and then `supabase/admin-schema.sql` after deploying this version so existing orders receive the nullable `customer_id` field and customer-owned order policy. Guest orders remain supported with a null `customer_id`.

In Supabase Authentication settings, configure the site URL and add the deployed storefront URL to the redirect allow list. The password reset flow returns to the storefront URL with a recovery session. Email confirmation may remain enabled; users must confirm their email before logging in when that setting is active.
