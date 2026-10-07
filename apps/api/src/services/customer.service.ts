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
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const groups = await prisma.bookingPassenger.groupBy({
    by: ["firstName", "lastName", "phone"],
    where,
    _count: { _all: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { phone: "asc" }],
  });
  const slice = groups.slice((page - 1) * limit, page * limit);
  const data = await Promise.all(
    slice.map(async (group) => {
      const latest = await prisma.bookingPassenger.findFirst({
        where: {
          ...where,
          firstName: group.firstName,
          lastName: group.lastName,
          phone: group.phone,
        },
        include: {
          booking: { include: { trip: { include: { route: true } } } },
        },
        orderBy: { booking: { createdAt: "desc" } },
      });
      return {
        id: `${group.phone}:${group.firstName}:${group.lastName}`,
        firstName: group.firstName,
        lastName: group.lastName,
        phone: group.phone,
        email: latest?.email ?? null,
        bookings: group._count._all,
        latestBooking: latest
          ? {
              pnr: latest.booking.pnr,
              status: latest.booking.status,
              createdAt: latest.booking.createdAt,
              route: `${latest.booking.trip.route.source} → ${latest.booking.trip.route.destination}`,
            }
          : null,
      };
    }),
  );
  return {
    data,
    meta: {
      page,
      limit,
      total: groups.length,
      totalPages: Math.max(1, Math.ceil(groups.length / limit)),
    },
  };
}
