-- Add indexes for the existing tenant-scoped lists, reports, and substring searches.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON "User" ("roleId");
CREATE INDEX IF NOT EXISTS "User_agencyId_branchId_status_idx" ON "User" ("agencyId", "branchId", "status");
CREATE INDEX IF NOT EXISTS "Trip_agencyId_status_departureTime_idx" ON "Trip" ("agencyId", "status", "departureTime");
CREATE INDEX IF NOT EXISTS "Trip_branchId_status_departureTime_idx" ON "Trip" ("branchId", "status", "departureTime");
CREATE INDEX IF NOT EXISTS "Trip_routeId_idx" ON "Trip" ("routeId");
CREATE INDEX IF NOT EXISTS "Trip_tripCode_trgm_idx" ON "Trip" USING GIN ("tripCode" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Booking_agencyId_bookedById_createdAt_idx" ON "Booking" ("agencyId", "bookedById", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_bookedById_idx" ON "Booking" ("bookedById");
CREATE INDEX IF NOT EXISTS "Booking_pnr_trgm_idx" ON "Booking" USING GIN (pnr gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BookingPassenger_phone_firstName_lastName_bookingId_idx" ON "BookingPassenger" (phone, "firstName", "lastName", "bookingId");
CREATE INDEX IF NOT EXISTS "BookingPassenger_firstName_trgm_idx" ON "BookingPassenger" USING GIN ("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BookingPassenger_lastName_trgm_idx" ON "BookingPassenger" USING GIN ("lastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BookingPassenger_phone_trgm_idx" ON "BookingPassenger" USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "BookingPassenger_email_trgm_idx" ON "BookingPassenger" USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Route_name_trgm_idx" ON "Route" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Notification_agencyId_userId_channel_createdAt_id_idx" ON "Notification" ("agencyId", "userId", channel, "createdAt", id);
