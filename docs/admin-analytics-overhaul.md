# Admin analytics identity rollout

## Production migration order

The SQL files in `supabase/sql` are manually applied migrations. Check the
production database schema before applying them. The migration required by
this change is `analytics-identity-overhaul.sql`. It depends on the existing
tables and functions supplied by these earlier scripts:

1. `profile-auth-migration.sql`
2. `admin-analytics.sql`
3. `free-games-analytics.sql`
4. `stripe-subscriptions.sql`, `premium-welcome-trial.sql`, and
   `seamless-signup-verification.sql` in their documented dependency order
5. `admin-user-management.sql`
6. `authenticated-user-analytics.sql`

Apply `authenticated-user-analytics.sql` first if it is absent in production,
then apply `analytics-identity-overhaul.sql`.
`rls-security-hardening.sql` is separate work and is not part of this rollout.

Apply the new migration **before** deploying this application version. It is
additive and does not delete old analytics rows. Existing accounts keep a null
`profiles.user_type`. Existing event rows do not acquire an inferred anonymous
ID, country, or user type. A historical row without such an ID is still visible
in content counters and, where its `user_id` is known, in account journeys.

## Source and interpretation

- Account totals and creation dates come from `auth.users`.
- Email verification comes from the matching Classendo verification record;
  `auth.users.email_confirmed_at` is used only when no Classendo verification
  record exists for a legacy account. This prevents automatic Supabase
  confirmation from counting as Classendo mailbox verification.
- `profiles.country_region` is the user's answer at signup.
- `analytics_account_countries.signup_country_observed` is the signup
  request's `x-vercel-ip-country` code when the app is running on Vercel.
- `analytics_account_countries.last_country_observed` is updated by later
  consented analytics requests. The two country observations are private and
  service-role writable only. They are IP-derived estimates, not exact
  locations; VPNs and proxies can change them. The app stores no raw IP in
  analytics tables.
- Guest metrics use consented anonymous browser IDs in local storage, with
  sessions separated after 30 minutes of inactivity. Browser storage deletion,
  another device, declined consent, and private browsing limit person counts.
  Converted anonymous IDs remain inspectable in the guest directory but are
  excluded from current unique-guest totals to avoid counting them twice.
- Historical guest events lacking an anonymous ID cannot be assigned to a
  returning guest. Historical game-play rows may lack an authenticated user
  because the old endpoint did not receive credentials.
- Page views are recorded once per path per session; game starts require a
  game interaction. The old content counters remain visible with a historical
  data caveat.

## Production checks

After applying the migration and deploying the app:

1. Run `select count(*) from auth.users;` and compare with **Total accounts**
   at `/admin/analytics`. Run `select user_type, count(*) from public.profiles
   group by user_type;` and compare with the type breakdown. Existing accounts
   should appear under **Not set** until they are classified.
2. Create a new account with analytics accepted. Select **Online tutor** and a
   country different from your current network location if convenient. Check
   `/admin/analytics/users` for username, email, type, supplied country,
   observed signup country (or **Unknown**), verification, and trial fields.
3. Verify that account's email. Reload the account journey and check the
   verification date and any trial activation. Compare the date with
   `classendo_email_verifications.verified_at`.
4. In another browser, accept analytics, visit a game, interact with it, then
   return after closing the tab. `/admin/analytics/guests` should show one
   anonymous identity with at least two sessions. Open the guest journey to
   see pages, game/topic activity, and approximate observed country.
5. Sign up in that same browser. The guest row should link to the username;
   the account journey should include pre-signup guest activity. The overview's
   guest count should exclude that converted identity while account count
   includes the new account.
6. Reject analytics in a fresh browser. No persistent anonymous ID or session
   key should be created, and the browser should not appear in the guest
   directory. A signup still creates an Auth account; signup observed country
   may be recorded separately if the proxy supplies it.
7. Confirm RLS remains enabled on `analytics_sessions`,
   `analytics_anonymous_account_links`, and `analytics_account_countries`, and
   that `anon` and `authenticated` have no table privileges on them. The
   migration grants access only to `service_role`.

Do not compare these guest counts directly with Vercel Analytics visitors.
They have different identity, consent, and country semantics.
