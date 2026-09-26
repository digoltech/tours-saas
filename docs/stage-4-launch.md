# Stage 4 launch and operations

Stage 4 adds tenant scoped notifications, cancellation requests, agency branding, plan and trial status, manual SaaS invoices, and audit history. Passenger and subscription payments remain offline; the app does not call a payment gateway.

## Apply the database migration

Back up the production database, set `DATABASE_URL` and `DIRECT_URL`, then apply all pending migrations during the release window:

```bash
bunx prisma migrate deploy --config prisma.config.ts
bun run prisma:generate
```

Do not use `prisma migrate dev` against production. API startup checks for Stage 4 tables and exits with the migration command if the schema is incomplete.

## Production environment

Set a 32 character or longer `JWT_SECRET`, production `DATABASE_URL` and `DIRECT_URL`, an HTTPS `WEB_URL`, a production `NEXT_PUBLIC_API_URL`, `RESEND_API_KEY`, and `MAIL_FROM` on a verified sender domain. The API validates its required production values at startup, and the web build fails if `NEXT_PUBLIC_API_URL` is missing.

SMS and WhatsApp use the provider-neutral HTTP adapter. Set each channel's provider URL and bearer token together. The adapter sends JSON `{ "to", "subject", "message", "channel" }` and treats HTTP 2xx as sent; non-2xx, missing provider setup, timeouts, and email errors are recorded as failed deliveries. Configure provider templates and any provider specific translation at the endpoint or in an adapter before enabling that channel for customers.

## Release checks

```bash
bun run prisma:validate
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run build
```

Confirm `GET /api/health` returns HTTP 200 with database health after migration. Before launch, manually verify an agency booking and its e-ticket, notification preferences and delivery status, request and review a cancellation, offline payment and refund records in finance reports, agency branding, trial expiry state, invoice creation/payment recording, and audit history. Repeat layout checks at phone, tablet, and desktop widths in current Chrome, Edge, Firefox, and Safari.

## Manual billing

Agency admins can request a plan. The request does not change the active subscription or charge a card. Super Admin sets the active plan and trial dates and creates invoices. Agency admins record invoice payment references after receiving offline payment. Subscription trial status changes to past due when the subscription is next read after its trial end; this release does not automatically suspend tenant access.
