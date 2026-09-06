# Supabase order storage

This project is a static GitHub Pages site, so it has no private server runtime. The optional order adapter uses the Supabase REST API with the public anon/publishable key and relies on database constraints and RLS.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Edit `supabase-config.js` with the project URL and public anon/publishable key:

```js
window.INDUS_CASA_SUPABASE = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY'
};
```

Use only the public anon/publishable key. Never put a service-role key, database password, SMTP password, or other secret in this file or in frontend code.

## Security model

The `orders` table accepts validated inserts for checkout, including only `New` orders and `Pending` or `COD` payment status. There is no public read, update, or delete policy, so customers cannot read other customers' orders. A future admin dashboard should use authenticated server-side access and its own RLS policies.

Until both values are configured, the storefront keeps its existing confirmation and email notification flow and does not attempt a database request. The email recipient remains `induscasafashion@gmail.com`.
