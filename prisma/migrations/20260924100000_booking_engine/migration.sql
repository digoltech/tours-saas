CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TYPE "TripSeatStatus" AS ENUM ('AVAILABLE', 'HELD', 'BOOKED');

ALTER TABLE "Agency"
  ADD COLUMN "maxDiscountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN "maxDiscountValue" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "Trip" ADD COLUMN "fare" DECIMAL(10,2) NOT NULL DEFAULT 0;

INSERT INTO "Permission" ("id", "code", "description") VALUES
  ('booking-read-permission', 'booking:read', 'Permission to search trips and read bookings'),
  ('booking-create-permission', 'booking:create', 'Permission to hold seats and create bookings')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."code" IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'BRANCH_ADMIN', 'AGENT')
  AND p."code" IN ('booking:read', 'booking:create')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

CREATE TABLE "BusSeatLayout" (
  "id" TEXT NOT NULL,
  "busId" TEXT NOT NULL,
  "rows" INTEGER NOT NULL,
  "columns" INTEGER NOT NULL,
  "disabledSeats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusSeatLayout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusSeatLayout_busId_key" ON "BusSeatLayout"("busId");
ALTER TABLE "BusSeatLayout" ADD CONSTRAINT "BusSeatLayout_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "pnr" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "holdToken" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "bookedById" TEXT NOT NULL,
  "boardingStopId" TEXT NOT NULL,
  "dropOffStopId" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "baseFare" DECIMAL(10,2) NOT NULL,
  "discountType" "DiscountType",
  "discountValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Booking_pnr_key" ON "Booking"("pnr");
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE UNIQUE INDEX "Booking_holdToken_key" ON "Booking"("holdToken");
CREATE INDEX "Booking_agencyId_createdAt_idx" ON "Booking"("agencyId", "createdAt");
CREATE INDEX "Booking_branchId_createdAt_idx" ON "Booking"("branchId", "createdAt");
CREATE INDEX "Booking_tripId_status_idx" ON "Booking"("tripId", "status");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dropOffStopId_fkey" FOREIGN KEY ("dropOffStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BookingPassenger" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "seatName" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "gender" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "documentType" TEXT,
  "documentReference" TEXT,
  CONSTRAINT "BookingPassenger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookingPassenger_bookingId_seatName_key" ON "BookingPassenger"("bookingId", "seatName");
CREATE INDEX "BookingPassenger_phone_idx" ON "BookingPassenger"("phone");
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TripSeat" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "seatName" TEXT NOT NULL,
  "status" "TripSeatStatus" NOT NULL DEFAULT 'AVAILABLE',
  "holdToken" TEXT,
  "heldById" TEXT,
  "holdExpiresAt" TIMESTAMP(3),
  "bookingId" TEXT,
  CONSTRAINT "TripSeat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TripSeat_tripId_seatName_key" ON "TripSeat"("tripId", "seatName");
CREATE INDEX "TripSeat_tripId_status_holdExpiresAt_idx" ON "TripSeat"("tripId", "status", "holdExpiresAt");
CREATE INDEX "TripSeat_holdToken_idx" ON "TripSeat"("holdToken");
CREATE INDEX "TripSeat_bookingId_idx" ON "TripSeat"("bookingId");
ALTER TABLE "TripSeat" ADD CONSTRAINT "TripSeat_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripSeat" ADD CONSTRAINT "TripSeat_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
