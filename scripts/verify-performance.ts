import { config } from "dotenv";
import assert from "node:assert/strict";
config({ path: "apps/api/.env", quiet: true });
const { prisma } = await import("../apps/api/src/config/prisma.js");
const { findUserByEmail, toAuthContext } =
  await import("../apps/api/src/services/auth.service.js");
const { listCustomers } =
  await import("../apps/api/src/services/customer.service.js");
const { getReports } =
  await import("../apps/api/src/services/finance.service.js");
const { searchTrips } =
  await import("../apps/api/src/services/booking.service.js");

try {
  const user = await findUserByEmail(
    process.env.PERF_EMAIL ?? "agency.admin.a@aone.local",
  );
  assert.ok(user, "Provide a seeded test account in PERF_EMAIL");
  const context = toAuthContext(user);
  let queryCount = 0;
  prisma.$on("query", () => {
    queryCount++;
  });
  const measured = async <T>(name: string, action: () => Promise<T>) => {
    queryCount = 0;
    const started = performance.now();
    const result = await action();
    console.log(
      `${name}: ${queryCount} SQL statements, ${Math.round(performance.now() - started)}ms`,
    );
    return result;
  };
  const customers = await measured("Customers (page 1)", () =>
    listCustomers(context, { limit: 1 }),
  );
  assert.equal(queryCount, 3, "Customer pages must use a constant number of queries");
  assert.ok(customers.data.length <= 1);
  const second = await listCustomers(context, { limit: 1, page: 2 });
  assert.equal(second.meta.total, customers.meta.total);
  if (customers.data.length && second.data.length)
    assert.notEqual(customers.data[0].id, second.data[0].id);
  const empty = await listCustomers(context, { page: 100000, limit: 1 });
  assert.equal(empty.meta.total, customers.meta.total);
  assert.equal(empty.data.length, 0);

  const page = await measured("Finance (one row)", () =>
    getReports(context, undefined, undefined, {}, { limit: 1 }),
  );
  const full = await getReports(
    context,
    undefined,
    undefined,
    {},
    { allBookings: true },
  );
  assert.ok(page.bookings.length <= 1);
  assert.equal(full.bookings.length, page.meta.total);
  assert.deepEqual(page.totals, full.totals);
  assert.deepEqual(page.branches, full.branches);
  assert.deepEqual(page.dailySales, full.dailySales);

  const trip = await prisma.trip.findFirst({
    where: {
      agencyId: context.agencyId ?? "__missing__",
      departureTime: { gt: new Date() },
      status: "SCHEDULED",
    },
    include: { route: true },
    orderBy: { departureTime: "asc" },
  });
  if (trip)
    await measured("Trip search (batch seat counts)", () =>
      searchTrips(context, {
        source: trip.route.source,
        destination: trip.route.destination,
        date: trip.travelDate.toISOString().slice(0, 10),
      }),
    );
  const indexes = await prisma.$queryRaw<{ name: string; valid: boolean }[]>`
    SELECT c.relname AS name, i.indisvalid AS valid FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname IN ('Trip_agencyId_status_departureTime_idx', 'Trip_branchId_status_departureTime_idx',
      'Booking_pnr_trgm_idx', 'BookingPassenger_phone_firstName_lastName_bookingId_idx', 'BookingPassenger_email_trgm_idx')
  `;
  assert.equal(indexes.length, 5);
  assert.ok(indexes.every((index) => index.valid));
  const plan = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id FROM "Trip" WHERE "agencyId" = ${context.agencyId}
      AND status = 'SCHEDULED' AND "departureTime" >= NOW() ORDER BY "departureTime" LIMIT 20
  `;
  // Planner output contains no passenger/user data or connection credentials.
  console.log(JSON.stringify({ upcomingTripsPlan: plan }));
  console.log(
    "Performance checks passed: bounded pages, complete aggregates/exports, valid indexes.",
  );
} finally {
  await prisma.$disconnect();
}
