# Phase 1 Checklist Audit

Audit date: 2026-09-24. Status reflects the active workspace after the Phase 1 completion work.

`Implemented` means the repository has the listed capability. `Partial` means code exists but at least one checklist behavior still needs live integration or operational verification. `Missing` means the checklist capability is not present.

| # | Checklist area | Status | Evidence |
|---|---|---|---|
| 1 | Project foundation | Implemented | Bun workspace scripts, TypeScript configs, Next App Router, Tailwind/shadcn conventions, Express, Prisma PostgreSQL datasource, env examples, folders, shared response/error conventions, README. |
| 2 | Design system and UI foundation | Implemented | Global styles, typography/spacing, reusable buttons, inputs, selects, dialog/table/card/badge/form components, loading/empty/error states, responsive shell and grids. |
| 3 | Authentication UI | Implemented | Login with validation/loading/error, API login, auth provider/current-user state, protected workspace proxy, account information, logout. |
| 4 | Super Admin dashboard | Implemented | Protected workspace shell, responsive navigation/header, profile and logout, live summary cards for agencies, branches, agents, buses, drivers, routes, and trips. |
| 5 | Agency management | Implemented | List, search/status filter, create, details, edit/status, deactivate; Prisma model and scoped CRUD endpoints. |
| 6 | Branch management | Implemented | Agency-scoped list/search/status filter, create, detail, edit/status, deactivate, Super Admin agency selection; model and scoped CRUD endpoints. |
| 7 | Agent management | Implemented | List/search/status, create/invite, detail, edit/status, branch assignment, deactivate; user/role/agency/branch models and scoped CRUD endpoints. |
| 8 | Bus management | Implemented | List/search/status, create, detail, edit/status, deactivate, type and branch assignment; tenant-owned model and CRUD API. |
| 9 | Driver management | Implemented | List/search/status, create, detail, edit/status, branch assignment, deactivate; tenant-owned model and CRUD API. |
| 10 | Route management | Implemented | List/search/status, create, detail, edit/status, source/destination; agency-owned model and CRUD API. |
| 11 | Stop management | Implemented | Route detail includes ordered stop list, add/edit/deactivate, sequence, city and point summary; route relationship and CRUD API. |
| 12 | Boarding/drop-off | Implemented | Per-stop BOARDING, DROP_OFF, or BOTH configuration and time offset; point model, upsert API, permission and ownership checks. |
| 13 | Trip management | Implemented | List/search/status, create/edit/detail/cancel, route/bus/driver/branch selectors and schedule validation; related models and CRUD API. |
| 14 | Multi-tenant SaaS architecture | Partial | Agency ownership, agency-to-branch/user/fleet/route/trip links, authenticated tenant context, scoped service queries, and cross-tenant policy unit tests exist. Live cross-tenant endpoint tests against the configured database have not been run. |
| 15 | Authentication and authorization | Implemented | Login/logout/current-user API, JWT HTTP-only cookie, auth/permission middleware, protected frontend routes and protected APIs. |
| 16 | RBAC | Implemented | SUPER_ADMIN, AGENCY_ADMIN, BRANCH_ADMIN, AGENT seed roles; resource permissions for agency, branch, agent, bus, driver, route, stop, boarding point, and trip. Trip cancellation permission is included in the seed. |
| 17 | Database | Partial | Prisma models, relations, foreign keys, indexes, unique constraints, migrations, and seed are present and schema validation/client generation pass. One migration is pending on the configured database; applying it and running the seed remain operational steps. |
| 18 | API foundation | Implemented | Standard success/error envelope, Zod validation, auth/RBAC/tenant checks, pagination/search, controller/service split, centralized error handler, and request logging exist. Logging currently uses the console. |
| 19 | Security | Partial | Passwords use Argon2id hashes, secrets stay in API env, JWT is HTTP-only, and protected operations check permission and ownership. Cross-tenant policy tests pass, but database-backed endpoint isolation tests were not run. |
| 20 | Phase 1 QA | Partial | TypeScript, ESLint, web/API build, Prisma validation/generation, and 7 API unit tests pass. Live migration/seed execution and authenticated browser CRUD/responsive smoke tests remain unverified. |

## Phase 1 frontend additions

- The seat layout builder lets an operator select an active bus, arrange its seat grid, and mark positions unavailable.
- Fare, commission, tax, and cancellation policy forms are available under Settings.
- These two screens use browser storage for this phase and do not persist configuration in PostgreSQL or synchronize across users/devices.

## Remaining verification and limits

- `prisma migrate status` found the existing `20260923120000_resend_email_workflows` migration unapplied. It was not applied because the configured datasource is a Supabase host and applying it would mutate that database.
- The Prisma seed was not run because it writes development agencies/users and replaces seeded role permissions. Run it only against a development database after the pending migration has been intentionally applied.
- Browser checks requiring a signed-in account and a populated database are not covered by the build or unit tests.
