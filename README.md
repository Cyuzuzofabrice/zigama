# Zigama v2: ikimina manager with login and database

Treasurers sign in; data lives in a Supabase (PostgreSQL) database protected by row-level security.
It records contributions, loans and repayments. It does NOT hold anyone's money.

## 1. Set up Supabase (about 10 minutes)
1. Create a free project at supabase.com. Note the **Project URL** and the **anon public key** (Settings > API).
2. Open **SQL Editor > New query**, paste all of `supabase/schema.sql`, click **Run**.
3. Authentication > Providers: keep Email on. For testing you may turn off "Confirm email"; turn it back ON before launch.
4. Authentication > URL Configuration: set Site URL to your site address (for local testing: http://localhost:5173).

## 2. Run it
    cp .env.example .env      # then put your URL and anon key inside
    npm install
    npm run dev               # open the address it prints
    npm test                  # money rules
    npm run typecheck
    npm run build             # upload /dist to Vercel, Netlify or any static host

On Vercel, add the two VITE_ variables under Project Settings > Environment Variables.
The anon key is meant to be public. Security comes from the row-level security rules in schema.sql, so never put the `service_role` key in this app.

## What is included
- Login (email and password), one group per account
- Members, contributions (MoMo, cash, bank), late list with WhatsApp reminder
- Loans with flat interest rounded to whole francs; a loan cannot exceed the group's cash (checked in the app AND in the database)
- Undo/restore for payments and repayments, plus an automatic audit log table
- Read-only member link (names and contributions only)
- Delete group and all data
- `docs/PRIVACY_POLICY_DRAFT.md`

## Before you take real members' data (important)
1. Rwanda's data protection law requires registering with the NCSA, and personal data must be stored in Rwanda unless the NCSA authorises storage abroad. Supabase is hosted abroad. Ask the NCSA or a lawyer what you need.
2. Have a lawyer finish and review the privacy policy and write simple terms of use.
3. Turn on email confirmation, and test the login on a real phone.
4. In Supabase, enable backups (paid plan) or export regularly.

## Not built yet
Kinyarwanda translation (get a native speaker), USSD, automatic MoMo payments, paid plans/billing, password reset page, multi-group accounts, in-app audit log viewer, automated browser tests.
Tested: the SQL schema was run on a local PostgreSQL with Supabase's auth functions stubbed. It passed: another user cannot read or write your group, a loan above the group's cash is rejected, bad phone numbers and fake member links are rejected, audit rows are written, and the member link returns no phone numbers. The money rules have unit tests. NOT tested: a live Supabase project, the login emails, and the screens in a real browser. Run the steps above and send me any error you see.
