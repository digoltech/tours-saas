# Architecture

## Phase 1 boundary

Phase 1 establishes the runnable frontend, API, shared package, environment contract, and Prisma datasource. Phase 2 adds authentication, database-backed roles and permissions, agency/branch ownership, and reusable tenant authorization middleware. Business CRUD, booking, payments, notifications, and reporting remain deferred.

## Multi-tenancy approach

A-One Tours & Travels SaaS uses logical multi-tenancy in one shared PostgreSQL database. Each agency is a tenant workspace, and branches, agents, fleet records, routes, and trips will belong to one tenant.

Tenant-owned records should carry a required `tenantId` (or an equivalent foreign key to the agency/tenant table). This makes ownership explicit, supports indexed tenant-scoped queries, and gives the API a consistent authorization boundary. Global records should be deliberately identified as global rather than implicitly shared.

The application will not use a separate database per tenant. Shared storage simplifies operations and enables platform-wide administration while preserving logical isolation through application authorization and query scoping.

## Planned request flow

1. Authentication middleware will identify the user and their active tenant.
2. Authorization middleware will verify the user's role and permissions.
3. Controllers will validate request input and call a service.
4. Services will apply business rules and call repositories.
5. Repositories will use Prisma and require tenant scope for tenant-owned resources.
6. Responses will use shared API contracts where frontend and backend communicate.

Every tenant-scoped repository method should accept a tenant identifier explicitly. Authorization must never rely on a tenant identifier supplied only by the client. The server should derive the active tenant from the authenticated session and verify branch or resource ownership before reads and writes.

## Package boundaries

- `apps/web` owns presentation, routing, and frontend interactions.
- `apps/api` owns HTTP, authentication, authorization, business services, and persistence orchestration.
- `packages/shared` owns small, dependency-light contracts shared by both applications.
- `prisma` owns the database schema and future migrations.

Business logic should not be placed directly in route registration files. Prisma should not be imported by frontend code or scattered through controllers.
