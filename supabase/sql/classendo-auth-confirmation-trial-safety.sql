-- Apply after signup-abuse-protection.sql and before disabling Supabase
-- Confirm Email. Supabase auto-confirmation must not itself grant a Premium
-- trial. Classendo's one-use verification RPC and the Google-only completion
-- RPC remain responsible for trial eligibility and grants.
-- This changes only a trigger definition; it preserves every existing account,
-- subscription, trial, and verification record.

drop trigger if exists on_auth_user_email_confirmed_welcome_trial on auth.users;
