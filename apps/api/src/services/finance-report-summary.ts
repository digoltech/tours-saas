import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export async function financeBookingSummary(
  scope: {
    agencyId?: string;
    branchId?: string;
    bookedById?: string;
    tripId?: string;
  },
  from?: string,
  to?: string,
  timezone = "UTC",
) {
  const conditions = [Prisma.sql`TRUE`];
  if (scope.agencyId)
    conditions.push(Prisma.sql`b."agencyId" = ${scope.agencyId}`);
  if (scope.branchId)
    conditions.push(Prisma.sql`b."branchId" = ${scope.branchId}`);
  if (scope.bookedById)
    conditions.push(Prisma.sql`b."bookedById" = ${scope.bookedById}`);
  if (scope.tripId) conditions.push(Prisma.sql`b."tripId" = ${scope.tripId}`);
  if (from)
    conditions.push(
      Prisma.sql`b."createdAt" >= ${new Date(`${from}T00:00:00.000Z`)}`,
    );
  if (to)
    conditions.push(
      Prisma.sql`b."createdAt" <= ${new Date(`${to}T23:59:59.999Z`)}`,
    );
  type Summary = {
    branches: {
      branchId: string;
      count: number;
      cancellations: number;
      value: number;
      refunds: number;
    }[];
    dailySales: { day: string; count: number; value: number }[];
  };
  const rows = await prisma.$queryRaw<Summary[]>(Prisma.sql`
    WITH filtered AS (
      SELECT b.id, b."branchId", b.status, b."totalAmount", b."createdAt"
      FROM "Booking" b WHERE ${Prisma.join(conditions, " AND ")}
    ), refund_totals AS (
      SELECT r."bookingId", SUM(r.amount) AS amount FROM "RefundRecord" r
      JOIN filtered b ON b.id = r."bookingId" GROUP BY r."bookingId"
    ), branches AS (
      SELECT b."branchId", COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS cancellations,
        COALESCE(SUM(b."totalAmount") FILTER (WHERE b.status <> 'CANCELLED'), 0) AS value,
        COALESCE(SUM(r.amount), 0) AS refunds
      FROM filtered b LEFT JOIN refund_totals r ON r."bookingId" = b.id GROUP BY b."branchId"
    ), days AS (
      SELECT to_char(b."createdAt" AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS count, SUM(b."totalAmount") AS value
      FROM filtered b WHERE b.status <> 'CANCELLED' GROUP BY day ORDER BY day DESC LIMIT 14
    )
    SELECT COALESCE((SELECT jsonb_agg(branches) FROM branches), '[]'::jsonb) AS branches,
      COALESCE((SELECT jsonb_agg(days ORDER BY day) FROM days), '[]'::jsonb) AS "dailySales"
  `);
  return rows[0] ?? { branches: [], dailySales: [] };
}
