# Security findings and release status — 2 October 2026

| Priority | Finding | Evidence | Remediation and status |
| --- | --- | --- | --- |
| Critical | Supabase `anon` and `authenticated` have read/write table grants while RLS is off on 34 sampled public tables. Direct Data API reachability has not been confirmed. | `bun run security:supabase-audit` against the configured project | Revoke migration prepared; **not applied**. Disable Data API in dashboard if unused, then repeat audit. Treat the data as potentially exposed until verified. |
| High | Sampled PostgreSQL connection had `pg_stat_ssl.ssl=false`. | Read-only audit script | Production URL validation now requires CA-backed `verify-full`; the live connection still needs the CA downloaded from Supabase and a TLS cutover. |
| High | Auth used stateless one-day JWTs without logout or role-change revocation; production cookie lacked `Secure`. | Prior `auth.service.ts` and `cookies.ts` | Session table, revocation, shorter Super Admin TTL, and secure cookie implemented. New schema migration and staging tests required before deploy. |
| High | Public and credential endpoints had no rate limits. | Prior `app.ts` and auth routes | Bounded in-process API limits and Nginx edge templates implemented. Counters reset on restart and are not shared across API processes; controlled staging load test pending. |
| Medium | Cookie writes lacked CSRF Origin enforcement and API security headers. | Prior `app.ts` | Origin check and Helmet/Next headers implemented; real-origin staging check pending. |
| Medium | Passenger rights workflow and published privacy notice were absent. | Prior routes/pages | Public and staff intake, admin queue, manual verification, audited export and conservative erasure implemented. Notice remains gated for legal details and review. |
| Medium | Full role-by-role two-agency integration matrix has not run against an isolated database. | Existing unit tests cover tenant policy and selected services | Run the matrix in staging before release. Focus on finance, exports, bulk routes, custom roles, inactive agencies/branches, and privacy cases. |
| Medium | Platform mutation audit writes after response completion and may be lost if the process fails at that point. | `apps/api/src/middleware/security-audit.ts` | Existing audit records for many business changes plus SecurityEvent for platform mutations and privacy exports. Move critical audit writes into transactional service operations in a later pass. |
| Medium | Edge protections cannot absorb large volumetric DDoS traffic. | Hostinger firewall scope | Nginx limits prepared; arrange CDN/WAF or provider mitigation for stronger availability. |

## Verification completed locally

`bun run typecheck`, `bun run lint`, `bun run test`, and `bun run build` completed during implementation. The Supabase audit was read-only; it returned the critical findings above. No live migration, Data API setting change, SSL enforcement, firewall change, or backup restoration was performed from this checkout. Staging acceptance steps are in `docs/security-deployment.md`.
