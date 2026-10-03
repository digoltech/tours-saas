# Digol TravelOS by Digol Tours

A multi-tenant bus, tour, and travel management platform. The repository contains the Phase 1 foundation, Stage 2 booking flow, and Stage 3 finance features, including organization, fleet, route, stop, boarding/drop-off, trip, authentication, RBAC, tenant management, seat inventory, payments, cancellations, refunds, settlements, ledgers, reports, and exports.

## Tech stack

- Bun, TypeScript, and a monorepo
- Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui primitives, and Lucide icons
- Express 5 API
- Prisma ORM with PostgreSQL/Supabase PostgreSQL

## Project structure

```text
apps/web       React frontend
apps/api       Express backend
packages/shared Shared TypeScript contracts
prisma         Prisma schema and migrations
docs           Architecture and product engineering notes
```

## Prerequisites

Install Bun 1.3+ and have access to a Supabase PostgreSQL project. Node.js is useful for editor tooling but is not required to run the application.

## Environment setup

1. Install dependencies with `bun install`.
2. Copy `apps/api/.env.example` to `apps/api/.env`.
3. Set `DATABASE_URL` and `DIRECT_URL` to the Supabase connection strings. Keep secrets local and never commit `.env` files.
4. Set `JWT_SECRET` to at least 32 random characters and `WEB_URL` to the frontend origin.
5. Copy `apps/web/.env.example` to `apps/web/.env.local` and set `NEXT_PUBLIC_API_URL`.
6. Set `RESEND_API_KEY`, `MAIL_FROM`, and `CONTACT_EMAIL` to send account, newsletter, and contact emails in production.

For production, serve web and API on one HTTPS origin and follow [the security deployment runbook](docs/security-deployment.md). The web build must set `NEXT_PUBLIC_API_URL` to an empty string; the API uses a CA-verified Supabase connection. Rate limits are local to each API process.

## Supabase and Prisma setup

Use the pooled Supabase URL for `DATABASE_URL` and the direct connection URL for `DIRECT_URL`. Generate the client with:

```bash
bun run prisma:generate
```

When a database is configured and a migration is needed:

```bash
bun run prisma:migrate
```

The Prisma schema and migrations include the current tenant, transport, booking, and finance models. With a configured database, run `bun run prisma:migrate` followed by `bun run prisma:seed`. See [docs/authentication.md](docs/authentication.md) for development accounts and authorization rules and [docs/finance.md](docs/finance.md) for Stage 3 behavior and API routes.

## Running the applications

```bash
bun run dev:web       # http://localhost:3000
bun run dev:api       # http://localhost:4000
bun run dev           # both applications
```

The frontend is a native Next.js App Router application. Navigation uses Next links and each dashboard area is represented by a Next route segment. React remains as Next.js' rendering runtime; no separate client-side router is used.

The frontend design system uses shadcn/ui conventions with `class-variance-authority`, `clsx`, and `tailwind-merge`. Its visual language uses red, deep green, white, and warm neutral tones. Typography uses Space Grotesk for headings, Manrope for interface copy, and IBM Plex Mono for route and operational metrics.

The API health endpoint is `GET http://localhost:4000/api/health` and returns `{ "success": true, "message": "API is running" }`. The Super Admin dashboard summarizes agencies, branches, agents, buses, drivers, routes, and trips.

Bus seat layouts, trip fares, agency discount caps, finance settings, payments, cancellations, refunds, commissions, settlements, and ledger entries are stored in PostgreSQL and shared across authorized users. Payments and refunds are recorded manually; no payment gateway is configured. Cancellation requires agency-configured tiers. Finance reports include tenant-scoped revenue, occupancy, cancellation, refund, commission, settlement, and ledger data, with CSV and PDF downloads.

Stage 4 adds persisted notification preferences/history, provider-neutral SMS and WhatsApp delivery, agency ticket branding, cancellation request review, trial and plan tracking, manual subscription invoices, and audit history. Booking and subscription payments remain offline. See [docs/stage-4-launch.md](docs/stage-4-launch.md) for production environment setup, migration, and release checks.

## Quality commands

```bash
bun run typecheck
bun run lint
bun run format:check
bun run build
```

## Development conventions

Keep route files thin and put business logic in services and repositories. Keep Prisma access centralized. Use strict TypeScript, shared contracts for cross-app types, environment variables for configuration, and tenant ownership fields on tenant-owned records. Finance changes belong in the finance service; posted payment, refund, and ledger history is retained as records.

See [docs/phase-1-audit.md](docs/phase-1-audit.md) for checklist status and evidence.

Security review artifacts: [prioritized findings](docs/security-findings.md) and [threat model](Tours-SaaS-threat-model.md). Run `bun run security:supabase-audit` for a read-only table-grant and connection-TLS check. The privacy notice stays unpublished until its legal details and retention schedule are approved.
