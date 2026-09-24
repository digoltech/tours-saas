# Architecture

## Applications

- `apps/web` is a Next.js App Router application. Workspace route files stay thin and use feature components for management flows.
- `apps/api` is an Express API. Controllers validate HTTP inputs with Zod; services apply authorization, tenant scoping, validation, and Prisma operations.
- `packages/shared` contains contracts shared between the applications.
- `prisma` owns the PostgreSQL schema, migrations, and development seed.

## Tenancy and access

The platform uses one PostgreSQL database with logical agency tenancy. Agency-owned records carry `agencyId`; branches and branch-scoped resources carry their parent identifiers. Auth context is loaded from the signed session cookie, and API services check the authenticated role and tenant before accessing records. Client-supplied identifiers do not grant access.

Super Admin may administer across agencies. Agency Admin is scoped to their agency. Branch Admin and Agent access is further restricted to their assigned branch. Resource permissions are stored in `Permission` and `RolePermission` records and enforced by API middleware.

## Data flow

1. The web app sends credentialed requests to Express.
2. Authentication middleware verifies the HTTP-only JWT cookie and loads the user and permissions.
3. Permission middleware guards each protected operation.
4. Controllers validate request payloads and query parameters.
5. Services verify resource ownership and execute Prisma operations.
6. API responses use the shared success/error envelope.

Commission, tax, and cancellation settings remain client-side and browser-local. Bus seat layouts, trip fares, agency discount caps, seat holds, trip seat inventory, passengers, and bookings are persisted in PostgreSQL. Booking confirmation locks the trip-seat rows in a transaction, validates the active hold and route points, then assigns the seats and generates a PNR atomically. Expired holds are released by the periodic API worker and during availability reads.
