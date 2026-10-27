-- The public verification endpoint invokes this RPC through the service role.
-- Browser-based lesson copying requires an authenticated Supabase session.
-- Revoke both direct anon grants and any inherited PUBLIC grant.
revoke execute on function public.complete_classendo_email_verification(text)
  from public, anon, authenticated;
grant execute on function public.complete_classendo_email_verification(text)
  to service_role;

revoke execute on function public.copy_lesson_set_once(uuid)
  from public, anon;
grant execute on function public.copy_lesson_set_once(uuid)
  to authenticated, service_role;
