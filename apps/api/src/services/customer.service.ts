import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { isBranchScoped } from "../middleware/tenant-policy.js";

export async function listCustomers(
  context: AuthContext,
  query: { search?: string; page?: number; limit?: number },
) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  const search = query.search?.trim() ?? "";
  const escapedSearch = search.replace(/[\\%_]/g, "\\$&");
  const scope =
    context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(isBranchScoped(context)
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        };
  const where = {
    booking: scope,
    ...(search
      ? {
          OR: [
            {
              firstName: {
                contains: escapedSearch,
                mode: "insensitive" as const,
              },
            },
            {
              lastName: {
                contains: escapedSearch,
                mode: "insensitive" as const,
              },
            },
            {
              phone: { contains: escapedSearch, mode: "insensitive" as const },
            },
            {
              email: { contains: escapedSearch, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  };
  // Keep grouping/pagination in Postgres; fetch the latest booking for the page
  // in one statement instead of loading every customer and issuing N queries.
  const conditions = [Prisma.sql`TRUE`];
  if (context.role !== "SUPER_ADMIN") {
    conditions.push(
      Prisma.sql`b."agencyId" = ${context.agencyId ?? "__missing__"}`,
    );
    if (isBranchScoped(context))
      conditions.push(
        Prisma.sql`b."branchId" = ${context.branchId ?? "__missing__"}`,
      );
  }
  if (search) {
    const pattern = `%${escapedSearch}%`;
    conditions.push(
      Prisma.sql`(p."firstName" ILIKE ${pattern} OR p."lastName" ILIKE ${pattern} OR p.phone ILIKE ${pattern} OR p.email ILIKE ${pattern})`,
    );
  }
  const sqlWhere = Prisma.join(conditions, " AND ");
  const [groups, totals] = await Promise.all([
    prisma.bookingPassenger.groupBy({
      by: ["firstName", "lastName", "phone"],
      where,
      _count: { _all: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { phone: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS total FROM (
        SELECT p."firstName", p."lastName", p.phone
        FROM "BookingPassenger" p JOIN "Booking" b ON b.id = p."bookingId"
        WHERE ${sqlWhere} GROUP BY p."firstName", p."lastName", p.phone
      ) customers`),
  ]);
  type Latest = {
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    pnr: string;
    status: string;
    createdAt: Date;
    source: string;
    destination: string;
  };
  const latest = groups.length
    ? await prisma.$queryRaw<Latest[]>(Prisma.sql`
    SELECT g.*, latest.* FROM (VALUES ${Prisma.join(groups.map((g) => Prisma.sql`(${g.firstName}, ${g.lastName}, ${g.phone})`))}) AS g("firstName", "lastName", phone)
    JOIN LATERAL (
      SELECT p.email, b.pnr, b.status, b."createdAt", r.source, r.destination
      FROM "BookingPassenger" p JOIN "Booking" b ON b.id = p."bookingId"
      JOIN "Trip" t ON t.id = b."tripId" JOIN "Route" r ON r.id = t."routeId"
      WHERE ${sqlWhere} AND p."firstName" = g."firstName" AND p."lastName" = g."lastName" AND p.phone = g.phone
      ORDER BY b."createdAt" DESC, b.id DESC, p.id DESC LIMIT 1
    ) latest ON TRUE`)
    : [];
  const latestByCustomer = new Map(
    latest.map((row) => [
      JSON.stringify([row.firstName, row.lastName, row.phone]),
      row,
    ]),
  );
  const total = Number(totals[0]?.total ?? 0);
  const data = groups.map((group) => {
    const row = latestByCustomer.get(
      JSON.stringify([group.firstName, group.lastName, group.phone]),
    );
    return {
      id: `${group.phone}:${group.firstName}:${group.lastName}`,
      firstName: group.firstName,
      lastName: group.lastName,
      phone: group.phone,
      email: row?.email ?? null,
      bookings: group._count._all,
      latestBooking: row
        ? {
            pnr: row.pnr,
            status: row.status,
            createdAt: row.createdAt,
            route: `${row.source} → ${row.destination}`,
          }
        : null,
    };
  });
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
