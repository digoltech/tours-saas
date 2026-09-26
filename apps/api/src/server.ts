import { app } from "./app.js";
import { environment } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { startSeatHoldCleanup } from "./services/seat-hold-cleanup.service.js";

async function startServer() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    const requiredTables = await prisma.$queryRaw<
      Array<{ tableName: string; exists: boolean }>
    >`
      SELECT required.table_name AS "tableName",
             to_regclass(format('public.%I', required.table_name)) IS NOT NULL AS "exists"
      FROM (VALUES
        ('TripSeat'),
        ('Booking'),
        ('BookingPassenger'),
        ('BusSeatLayout'),
        ('Notification'),
        ('CancellationRequest'),
        ('AuditLog'),
        ('Subscription'),
        ('SubscriptionInvoice')
      ) AS required(table_name)
    `;
    const missingTables = requiredTables
      .filter((table) => !table.exists)
      .map((table) => table.tableName);

    if (missingTables.length > 0) {
      throw new Error(
        `Database connection succeeded, but the application schema is incomplete (missing ${missingTables.join(", ")}). Apply migrations with: bunx prisma migrate deploy --config prisma.config.ts`,
      );
    }

    console.info("Database connection verified");
  } catch (error) {
    console.error("API startup database check failed:", error);
    await prisma.$disconnect().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  startSeatHoldCleanup();
  app.listen(environment.PORT, () => {
    console.info(`API listening on http://localhost:${environment.PORT}`);
  });
}

void startServer();
