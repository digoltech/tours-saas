import { PrivacyRequestStatus, type PrivacyRequestType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";

type RequestInput = { type: PrivacyRequestType; subjectName: string; contactEmail?: string | null; contactPhone?: string | null; bookingPnr?: string | null; reason?: string | null };

function fail(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode });
}
const digits = (value: string) => value.replace(/\D/g, "");

export function passengerMatches(passenger: { firstName: string; lastName: string; email: string | null; phone: string }, input: RequestInput) {
  const sameName = `${passenger.firstName} ${passenger.lastName}`.trim().toLowerCase() === input.subjectName.trim().toLowerCase();
  const sameEmail = Boolean(input.contactEmail && passenger.email?.toLowerCase() === input.contactEmail.toLowerCase());
  const phone = input.contactPhone ? digits(input.contactPhone) : "";
  const passengerPhone = digits(passenger.phone);
  const samePhone = phone.length >= 10 && passengerPhone.length >= 10 && passengerPhone.slice(-10) === phone.slice(-10);
  return sameName && (sameEmail || samePhone);
}

export function canReviewPrivacyRequest(context: AuthContext, agencyId: string | null) {
  return context.role === "SUPER_ADMIN" || (context.role === "AGENCY_ADMIN" && Boolean(agencyId && context.agencyId === agencyId));
}

export async function submitPublicRequest(input: RequestInput) {
  return prisma.privacyRequest.create({ data: {
    type: input.type,
    subjectName: input.subjectName.trim(),
    contactEmail: input.contactEmail?.trim().toLowerCase() || null,
    contactPhone: input.contactPhone?.trim() || null,
    bookingPnr: input.bookingPnr?.trim().toUpperCase() || null,
    reason: input.reason?.trim() || null,
  }, select: { id: true } });
}

export async function submitStaffRequest(context: AuthContext, type: PrivacyRequestType, reason?: string) {
  return prisma.privacyRequest.create({ data: {
    type, userId: context.userId, agencyId: context.agencyId,
    subjectName: `${context.firstName} ${context.lastName}`,
    contactEmail: context.email,
    reason: reason?.trim() || null,
  }, select: { id: true, status: true } });
}

export async function listRequests(context: AuthContext) {
  return prisma.privacyRequest.findMany({ where: context.role === "SUPER_ADMIN" ? {} : context.role === "AGENCY_ADMIN" && context.agencyId ? { OR: [{ userId: context.userId }, { agencyId: context.agencyId }] } : { userId: context.userId },
    orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, type: true, status: true, subjectName: true, contactEmail: true, contactPhone: true, bookingPnr: true, reason: true, reviewNote: true, agencyId: true, userId: true, createdAt: true, verifiedAt: true, completedAt: true } });
}

export async function reviewRequest(context: AuthContext, id: string, action: "VERIFY" | "REJECT" | "RETAIN" | "COMPLETE", note: string) {
  const item = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!item) fail(404, "Request not found");
  if (!canReviewPrivacyRequest(context, item.agencyId)) fail(403, "Access denied");
  if (action === "VERIFY" && item.status !== "PENDING") fail(409, "Request was already reviewed");
  if (action === "REJECT" && !["PENDING", "VERIFIED"].includes(item.status)) fail(409, "Request was already resolved");
  if (action !== "VERIFY" && action !== "REJECT" && item.status !== "VERIFIED") fail(409, "Verify identity before resolving the request");
  if (action === "VERIFY") {
    let agencyId = item.agencyId;
    if (item.bookingPnr) {
      const booking = await prisma.booking.findUnique({ where: { pnr: item.bookingPnr }, include: { passengers: true } });
      if (!booking || !booking.passengers.some((passenger) => passengerMatches(passenger, item))) fail(400, "Booking identity details do not match");
      if (context.role !== "SUPER_ADMIN" && context.agencyId !== booking.agencyId) fail(403, "Access denied");
      agencyId = booking.agencyId;
    } else if (!item.userId) fail(400, "A public request needs a booking reference for verification");
    const [updated] = await prisma.$transaction([
      prisma.privacyRequest.update({ where: { id, status: "PENDING" }, data: { status: "VERIFIED", agencyId, verifiedAt: new Date(), reviewedById: context.userId, reviewNote: note } }),
      prisma.securityEvent.create({ data: { userId: context.userId, action: "PRIVACY_VERIFY", route: "/api/privacy/requests/:id/review" } }),
    ]);
    return updated;
  }
  if (action === "REJECT" || action === "RETAIN") {
    const [updated] = await prisma.$transaction([
      prisma.privacyRequest.update({ where: { id, status: item.status }, data: { status: action === "REJECT" ? "REJECTED" : "RETAINED", reviewedById: context.userId, reviewNote: note, completedAt: new Date() } }),
      prisma.securityEvent.create({ data: { userId: context.userId, action: `PRIVACY_${action}`, route: "/api/privacy/requests/:id/review" } }),
    ]);
    return updated;
  }
  if (item.type === "ERASURE") {
    if (!item.bookingPnr) fail(409, "Staff account erasure requires a separately approved retention schedule");
    const booking = await prisma.booking.findUnique({ where: { pnr: item.bookingPnr }, include: { passengers: true, trip: true, payments: true, refunds: true, ledgerEntries: true } });
    if (!booking || booking.agencyId !== item.agencyId) fail(404, "Booking not found");
    if (booking.trip.status !== "COMPLETED" && booking.status !== "CANCELLED") fail(409, "Travel is still active; retain the request until completion");
    if (booking.payments.length || booking.refunds.length || booking.ledgerEntries.length) fail(409, "Financial records require a retention review");
    const matches = booking.passengers.filter((passenger) => passengerMatches(passenger, item));
    if (matches.length !== 1) fail(409, "Resolve the passenger identity before erasure");
    return prisma.$transaction(async (tx) => {
      await tx.bookingPassenger.update({ where: { id: matches[0].id }, data: { firstName: "Redacted", lastName: "Passenger", age: 0, gender: "UNSPECIFIED", phone: "REDACTED", email: null, documentType: null, documentReference: null } });
      const updated = await tx.privacyRequest.update({ where: { id, status: "VERIFIED" }, data: { status: "COMPLETED", subjectName: "Redacted passenger", contactEmail: null, contactPhone: null, reviewedById: context.userId, reviewNote: note, completedAt: new Date() } });
      await tx.securityEvent.create({ data: { userId: context.userId, action: "PRIVACY_ERASURE", route: "/api/privacy/requests/:id/review" } });
      return updated;
    });
  }
  const [updated] = await prisma.$transaction([
    prisma.privacyRequest.update({ where: { id, status: "VERIFIED" }, data: { status: "COMPLETED", reviewedById: context.userId, reviewNote: note, completedAt: new Date() } }),
    prisma.securityEvent.create({ data: { userId: context.userId, action: "PRIVACY_COMPLETE", route: "/api/privacy/requests/:id/review" } }),
  ]);
  return updated;
}

export async function exportRequest(context: AuthContext, id: string) {
  const item = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!item || item.status !== PrivacyRequestStatus.VERIFIED || !canReviewPrivacyRequest(context, item.agencyId)) fail(403, "Verified request required");
  if (item.userId) {
    const user = await prisma.user.findUnique({ where: { id: item.userId }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true, agencyId: true, status: true } });
    if (!user || user.agencyId !== item.agencyId) fail(404, "User not found");
    await prisma.securityEvent.create({ data: { userId: context.userId, action: "PRIVACY_EXPORT", route: "/api/privacy/requests/:id/export" } });
    return { requestId: id, user };
  }
  if (!item.bookingPnr) fail(400, "Booking reference required");
  const booking = await prisma.booking.findUnique({ where: { pnr: item.bookingPnr }, include: { passengers: true } });
  if (!booking || booking.agencyId !== item.agencyId) fail(404, "Booking not found");
  const passengers = booking.passengers.filter((passenger) => passengerMatches(passenger, item));
  if (passengers.length !== 1) fail(409, "Resolve the passenger identity before export");
  await prisma.securityEvent.create({ data: { userId: context.userId, action: "PRIVACY_EXPORT", route: "/api/privacy/requests/:id/export" } });
  return { requestId: id, booking: { pnr: booking.pnr, status: booking.status, createdAt: booking.createdAt }, passenger: passengers[0] };
}
