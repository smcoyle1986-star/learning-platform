# Signup protection operations

Classendo blocks known disposable email domains at the Supabase Auth layer. The
hook runs before user creation, so it protects the website and direct Supabase
Auth API calls alike.

The project keeps a private local snapshot of the daily-updated
[`disposable/disposable-email-domains`](https://github.com/disposable/disposable-email-domains)
list. Refresh it from the repository root with:

```bash
npx tsx scripts/sync-disposable-email-domains.ts
```

The repository also runs this automatically every Sunday at 03:17 UTC through
GitHub Actions. It uses the repository secrets `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`; neither value is kept in the workflow file.

The sync only adds or refreshes domains. It deliberately does not automatically
remove old entries, so a temporary upstream outage cannot weaken protection.
Review and remove an entry manually if a legitimate provider is ever listed by
mistake.

Rejected attempts are shown in the administrator dashboard as a domain, reason,
and time only. No email address or password is logged.
