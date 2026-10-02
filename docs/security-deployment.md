# Security deployment runbook

The application is designed for one public HTTPS origin. Nginx routes `/api/` to Express on `127.0.0.1:4000` and other paths to Next.js on `127.0.0.1:3000`. Use the templates in `deploy/hostinger/`, replace the domain and certificate paths, then run `nginx -t` before reload. Keep both Bun processes and Redis bound to loopback. Set `WEB_URL=https://your-domain`, `NEXT_PUBLIC_API_URL=` (empty), and `API_INTERNAL_URL=http://127.0.0.1:4000`. Build Next.js with that public API setting, since `NEXT_PUBLIC_*` is compiled into browser assets.

## Release order

1. Take a Supabase backup and restore it into a separate staging project. Test the application there first. Keep the old app deployed until the migration and new app are ready together: the API checks for `Session`, `PrivacyRequest`, and `SecurityEvent` at startup.
2. In Supabase Database settings, download this project's CA certificate. Put it at a root-owned, readable path on the VPS, such as `/etc/a-one-tours/supabase-ca.crt`. Set both the runtime and migration URLs to `sslmode=verify-full&sslrootcert=/etc/a-one-tours/supabase-ca.crt`; confirm the hostname matches the certificate. Keep migration credentials in an operator-only environment, not in the API service environment. Production API startup rejects a runtime URL without these TLS parameters.
3. Create a database runtime role limited to the objects Prisma needs. Run the migrations with a separate migration role that can create and alter schema objects. Grant runtime `USAGE` on schema `public`, `SELECT, INSERT, UPDATE, DELETE` on the application tables, and sequence `USAGE` only where required. Do not give the runtime role `BYPASSRLS`, `CREATEROLE`, `CREATEDB`, or schema ownership. Test migration and runtime roles on staging. Rotate the current database password after cutover.
4. Apply pending migrations with `bunx prisma migrate deploy --config prisma.config.ts` using the migration URL. The second new migration revokes `anon` and `authenticated` grants on all public tables and sequences. Run `bun run security:supabase-audit` afterward; no application table should show those roles with table privileges. Check new objects too because existing default privileges may have been set by more than one creator role.
5. In the Supabase dashboard, disable the Data API if no other client uses it. Enable SSL enforcement after all clients have moved to TLS; this causes a database restart. Restrict database network access to the VPS egress IP and approved maintenance IPs when feasible. Recheck pooled and direct connection modes after changes.
6. Start Redis with `bind 127.0.0.1`, `protected-mode yes`, and no public port; rate-limit state can be disposable. Configure `REDIS_URL=redis://127.0.0.1:6379` for the API. The API fails closed on protected requests when Redis is unavailable in production.
7. Install the systemd service units, run as a dedicated non-root account, and allow it only read access to its environment and CA files. Set file permissions on `/etc/a-one-tours/*` to prevent other accounts reading secrets. Verify both app listeners with `ss -lntp`.
8. Open only ports 80 and 443 publicly in the Hostinger firewall. Restrict SSH to administrator IPs, use key authentication, disable root login and password authentication after confirming a working key session. Enable unattended security updates. Add health, process restart, TLS expiry, disk, database connectivity, and 429/5xx rate alerts. Protect backups and periodically perform a timed restore test.
9. Test from outside the VPS: HTTP redirects to HTTPS; `/api/health` works; API and web ports and Redis cannot be reached directly; HSTS and security headers are present; cookie has `Secure`, `HttpOnly`, `SameSite=Lax`; cross-origin writes fail; excessive controlled requests return 429 then recover after their window. Do not send load tests to production.

## Privacy release gate

The `/privacy` notice returns 404 until `PRIVACY_POLICY_APPROVED=true` and `PRIVACY_LEGAL_NAME`, `PRIVACY_POSTAL_ADDRESS`, `PRIVACY_EMAIL`, and `PRIVACY_RETENTION_SUMMARY` are supplied. Rebuild the web app after setting these variables so the footer link matches the notice. Have Indian privacy counsel review the notice, the actual processor list and transfer locations, lawful retention periods, grievance contact, and request handling before enabling it. The public request form remains available for intake and routes cases to Super Admin for manual identity verification. Record the verification method in the review note without copying identity documents into that note. Never send exports from an unverified request.

## Availability boundary

Nginx and Redis limits protect normal abusive clients and application resources. Hostinger's VPS firewall does not absorb a large volumetric DDoS. Arrange upstream CDN/WAF protection and a provider escalation path if that availability risk is unacceptable.

## Acceptance evidence to collect in staging

- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run prisma:validate`.
- Role-by-role, two-agency API tests for reads, writes, CSV/PDF exports, bulk imports, finance, role mutation, and privacy review/export. Include branch and custom roles, inactive users, and revoked sessions.
- `bun run security:supabase-audit` with an SSL connection and no `anon`/`authenticated` table grants. Test a direct Data API read with an anon key fails or confirm Data API disabled in dashboard.
- Restore a production-shaped backup to isolated staging; confirm bookings, passenger records, sessions, and finance reports after migration.

Supabase guidance: [direct connections and CA verification](https://supabase.com/docs/guides/database/connecting-to-postgres), [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement), [securing the Data API](https://supabase.com/docs/guides/api/securing-your-api). Hostinger guidance: [VPS firewall scope](https://www.hostinger.com/support/8172641-how-to-use-a-managed-vps-firewall-at-hostinger/).
