# Authentication and Authorization

## Authentication flow

`POST /api/auth/login` validates credentials, verifies an Argon2id password hash with Bun, and issues a JWT in the HTTP-only `aone_session` cookie. The JWT contains only a session type and user subject. The secret is read only by the Express API from `JWT_SECRET`.

`GET /api/auth/me` verifies the cookie, loads the current user and role permissions from Prisma, and returns safe user data. Password hashes are never returned. `POST /api/auth/logout` clears the cookie. Because the session is stateless, logout clears the browser cookie but does not claim server-side token revocation.

## RBAC and tenant isolation

Roles are database records represented by `RoleCode`: `SUPER_ADMIN`, `AGENCY_ADMIN`, `BRANCH_ADMIN`, and `AGENT`. Permissions are database records such as `agency:read` and connect through `RolePermission`. Express middleware provides `requireRole()` and `requirePermission()`.

Tenant context is derived from the authenticated user. Super Admin has no fake agency ID and can access all agencies. Other roles must have an agency, and branch roles must have a branch. `requireTenantAccess()` compares authenticated context with the server-side target scope; client-provided agency or branch values never grant access.

Unauthenticated requests return `401`. Authenticated users without a matching role, permission, agency, or branch return `403`.

## Development setup

Copy `apps/api/.env.example` to `apps/api/.env`, add real Supabase URLs and a 32-character minimum JWT secret, then run:

```bash
bun run prisma:generate
bun run prisma:migrate
bun run prisma:seed
```

Development seed users share the password `AOnePhase2!2026`:

- `super.admin@aone.local`
- `agency.admin.a@aone.local`
- `branch.admin.a1@aone.local`
- `agent.a1@aone.local`

These accounts are for local development only and must never be used in production.

## Next.js protection

Next middleware redirects requests without an `aone_session` cookie to `/login`. This is a navigation guard only. Express remains the final security boundary and verifies the JWT, loads the user, checks status, permissions, and tenant ownership on every protected request.
