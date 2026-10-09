import { financeBookingSummary } from "./finance-report-summary.js";
import { Prisma, type BookingStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import {
  canAccessTenant,
  isBranchScoped,
} from "../middleware/tenant-policy.js";
import { calculateCancellation } from "./finance-calculations.js";

type FinanceMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "UPI" | "OTHER";
type Party = "AGENT" | "OPERATOR";
type ErrorWithStatus = Error & { statusCode?: number; code?: string };
function fail(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as ErrorWithStatus;
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}
function assertAgency(
  context: AuthContext,
  agencyId: string,
  branchId?: string,
) {
  if (!canAccessTenant(context, agencyId, branchId))
    fail(403, "FORBIDDEN", "You do not have access to this finance record");
}
async function loadBooking(context: AuthContext, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, refunds: true, trip: true },
  });
  if (!booking) fail(404, "NOT_FOUND", "Booking not found");
  assertAgency(context, booking.agencyId, booking.branchId);
  return booking;
}
export async function getBookingFinanceByPnr(
  context: AuthContext,
  pnr: string,
) {
  const booking = await prisma.booking.findUnique({
    where: { pnr: pnr.toUpperCase() },
    include: { payments: true, refunds: true, cancellation: true },
  });
  if (!booking) fail(404, "NOT_FOUND", "Booking not found");
  assertAgency(context, booking.agencyId, booking.branchId);
  return booking;
}
export async function saveSettings(
  context: AuthContext,
  input: {
    agencyId?: string;
    gstRate: number;
    gstAfterDiscount: boolean;
    commissionType: "FIXED" | "PERCENTAGE";
    commissionValue: number;
    tiers: { hoursBeforeDeparture: number; feePercent: number }[];
  },
) {
  if (!["AGENCY_ADMIN", "SUPER_ADMIN"].includes(context.role))
    fail(403, "FORBIDDEN", "Only agency owners can change finance settings");
  if (
    context.role !== "SUPER_ADMIN" &&
    (context.roleScope !== "AGENCY" ||
      !context.permissions.includes("finance:settings"))
  )
    fail(
      403,
      "FORBIDDEN",
      "Only agency administrators can update finance settings",
    );
  const targetAgency =
    context.role === "SUPER_ADMIN"
      ? (input.agencyId ?? "")
      : (context.agencyId ?? "");
  if (!targetAgency)
    fail(
      400,
      "INVALID_REQUEST",
      "Choose an agency before updating finance settings",
    );
  if (
    context.role !== "SUPER_ADMIN" &&
    input.agencyId &&
    input.agencyId !== targetAgency
  )
    fail(403, "FORBIDDEN", "You can only update your agency finance settings");
  if (
    input.gstRate < 0 ||
    input.gstRate > 100 ||
    input.commissionValue < 0 ||
    (input.commissionType === "PERCENTAGE" && input.commissionValue > 100)
  )
    fail(
      400,
      "INVALID_REQUEST",
      "Tax or commission rate is outside the supported range",
    );
  const seen = new Set<number>();
  for (const tier of input.tiers) {
    if (
      tier.hoursBeforeDeparture < 0 ||
      tier.feePercent < 0 ||
      tier.feePercent > 100 ||
      seen.has(tier.hoursBeforeDeparture)
    )
      fail(
        400,
        "INVALID_REQUEST",
        "Cancellation tiers must have unique non-negative hours and fee percentages from 0 to 100",
      );
    seen.add(tier.hoursBeforeDeparture);
  }
  return prisma.$transaction(async (tx) => {
    const settings = await tx.financeSettings.upsert({
      where: { agencyId: targetAgency },
      update: {
        gstRate: input.gstRate,
        gstAfterDiscount: input.gstAfterDiscount,
        commissionType: input.commissionType,
        commissionValue: input.commissionValue,
      },
      create: {
        agencyId: targetAgency,
        gstRate: input.gstRate,
        gstAfterDiscount: input.gstAfterDiscount,
        commissionType: input.commissionType,
        commissionValue: input.commissionValue,
      },
    });
    await tx.cancellationTier.deleteMany({ where: { agencyId: targetAgency } });
    if (input.tiers.length)
      await tx.cancellationTier.createMany({
        data: input.tiers.map((t) => ({
          agencyId: targetAgency,
          hoursBeforeDeparture: t.hoursBeforeDeparture,
          feePercent: t.feePercent,
        })),
      });
    await tx.auditLog.create({
      data: {
        agencyId: targetAgency,
        actorId: context.userId,
        action: "FINANCE_SETTINGS_UPDATED",
        entityType: "FinanceSettings",
        entityId: targetAgency,
      },
    });
    return { ...settings, tiers: input.tiers };
  });
}
export async function getSettings(
  context: AuthContext,
  requestedAgencyId?: string,
) {
  const agencyId =
    context.role === "SUPER_ADMIN" ? requestedAgencyId : context.agencyId;
  if (!agencyId) return { settings: null, tiers: [] };
  assertAgency(context, agencyId);
  const [settings, tiers] = await Promise.all([
    prisma.financeSettings.findUnique({ where: { agencyId } }),
    prisma.cancellationTier.findMany({
      where: { agencyId },
      orderBy: { hoursBeforeDeparture: "desc" },
    }),
  ]);
  return { settings, tiers };
}
export async function recordPayment(
  context: AuthContext,
  bookingId: string,
  input: { amount: number; method: FinanceMethod; reference?: string },
) {
  const booking = await loadBooking(context, bookingId);
  if (booking.status !== "CONFIRMED")
    fail(
      409,
      "BOOKING_CLOSED",
      "Payments cannot be added to a cancelled booking",
    );
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    fail(400, "INVALID_REQUEST", "Payment amount must be positive");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const current = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { payments: true },
    });
    if (current.status !== "CONFIRMED")
      fail(
        409,
        "BOOKING_CLOSED",
        "Payments cannot be added to a cancelled booking",
      );
    const paid = current.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (paid + input.amount > Number(current.totalAmount) + 0.001)
      fail(409, "OVERPAYMENT", "Payment exceeds the remaining booking balance");
    const payment = await tx.paymentRecord.create({
      data: {
        bookingId,
        agencyId: booking.agencyId,
        amount: input.amount,
        method: input.method,
        reference: input.reference || null,
        recordedById: context.userId,
      },
    });
    await tx.financeLedger.create({
      data: {
        agencyId: booking.agencyId,
        branchId: booking.branchId,
        bookingId,
        type: "PAYMENT",
        amount: input.amount,
        description: `Payment received for booking ${booking.pnr}`,
      },
    });
    await tx.auditLog.create({
      data: {
        agencyId: booking.agencyId,
        branchId: booking.branchId,
        actorId: context.userId,
        action: "PAYMENT_RECORDED",
        entityType: "Booking",
        entityId: bookingId,
        details: { amount: input.amount, method: input.method },
      },
    });
    return payment;
  });
}
export async function cancelBooking(
  context: AuthContext,
  bookingId: string,
  reason?: string,
) {
  const booking = await loadBooking(context, bookingId);
  if (booking.status !== "CONFIRMED")
    fail(409, "BOOKING_CLOSED", "Booking is already cancelled");
  const tiers = await prisma.cancellationTier.findMany({
    where: { agencyId: booking.agencyId },
    orderBy: { hoursBeforeDeparture: "desc" },
  });
  if (!tiers.length)
    fail(
      409,
      "CANCELLATION_POLICY_MISSING",
      "The agency must configure cancellation tiers before bookings can be cancelled",
    );
  const hours = (booking.trip.departureTime.getTime() - Date.now()) / 3600000;
  const total = Number(booking.totalAmount);
  const cancellation = calculateCancellation(
    total,
    hours,
    tiers.map((t) => ({
      hoursBeforeDeparture: Number(t.hoursBeforeDeparture),
      feePercent: Number(t.feePercent),
    })),
  );
  const { feePercent, feeAmount, eligibleRefund } = cancellation;
  const reverseRatio = total ? eligibleRefund / total : 0;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancellationFee: feeAmount },
    });
    if (updated.count !== 1)
      fail(409, "BOOKING_CLOSED", "Booking has already been cancelled");
    await tx.bookingCancellation.create({
      data: {
        bookingId,
        feeAmount,
        eligibleRefund,
        cancelledById: context.userId,
        reason: reason || null,
      },
    });
    await tx.auditLog.create({
      data: {
        agencyId: booking.agencyId,
        branchId: booking.branchId,
        actorId: context.userId,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: bookingId,
        details: { feeAmount, eligibleRefund },
      },
    });
    await tx.tripSeat.updateMany({
      where: { bookingId, status: "BOOKED" },
      data: {
        bookingId: null,
        status: "AVAILABLE",
        holdToken: null,
        heldById: null,
        holdExpiresAt: null,
      },
    });
    await tx.financeLedger.create({
      data: {
        agencyId: booking.agencyId,
        branchId: booking.branchId,
        bookingId,
        type: "OPERATOR_PAYABLE",
        party: "OPERATOR",
        partyId: booking.agencyId,
        amount:
          -Math.round(
            (Number(booking.totalAmount) -
              Number(booking.taxAmount) -
              Number(booking.commissionAmount)) *
              reverseRatio *
              100,
          ) / 100,
        description: `Operator payable reversed for cancelled booking ${booking.pnr}`,
      },
    });
    const commission = await tx.agentCommission.findUnique({
      where: { bookingId },
    });
    if (commission) {
      const reversedAmount =
        Math.round(Number(commission.amount) * reverseRatio * 100) / 100;
      await tx.agentCommission.update({
        where: { bookingId },
        data: { reversedAmount },
      });
      await tx.financeLedger.create({
        data: {
          agencyId: booking.agencyId,
          branchId: booking.branchId,
          bookingId,
          type: "COMMISSION_REVERSAL",
          party: "AGENT",
          partyId: commission.agentId,
          amount: -reversedAmount,
          description: `Commission reversal for cancelled booking ${booking.pnr}`,
        },
      });
    }
    return {
      bookingId,
      feeAmount,
      eligibleRefund,
      feePercent,
      seatsReleased: true,
    };
  });
}
export async function recordRefund(
  context: AuthContext,
  bookingId: string,
  input: { amount: number; method: FinanceMethod; reference?: string },
) {
  const booking = await loadBooking(context, bookingId);
  if (booking.status !== "CANCELLED")
    fail(
      409,
      "BOOKING_NOT_CANCELLED",
      "Refunds can only be recorded after cancellation",
    );
  if (input.amount <= 0)
    fail(400, "INVALID_REQUEST", "Refund amount must be positive");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const current = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { payments: true, refunds: true, cancellation: true },
    });
    const paid = current.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const refunded = current.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    const cap = Math.min(
      paid,
      Number(current.cancellation?.eligibleRefund ?? 0),
    );
    if (current.status !== "CANCELLED" || refunded + input.amount > cap + 0.001)
      fail(
        409,
        "REFUND_LIMIT",
        "Refund exceeds the eligible amount paid for this booking",
      );
    const refund = await tx.refundRecord.create({
      data: {
        bookingId,
        agencyId: booking.agencyId,
        amount: input.amount,
        method: input.method,
        reference: input.reference || null,
        recordedById: context.userId,
      },
    });
    await tx.financeLedger.create({
      data: {
        agencyId: booking.agencyId,
        branchId: booking.branchId,
        bookingId,
        type: "REFUND",
        amount: -input.amount,
        description: `Refund issued for booking ${booking.pnr}`,
      },
    });
    await tx.auditLog.create({
      data: {
        agencyId: booking.agencyId,
        branchId: booking.branchId,
        actorId: context.userId,
        action: "REFUND_RECORDED",
        entityType: "Booking",
        entityId: bookingId,
        details: { amount: input.amount, method: input.method },
      },
    });
    return refund;
  });
}
export async function postSettlement(
  context: AuthContext,
  input: {
    party: Party;
    partyId: string;
    amount: number;
    method: FinanceMethod;
    reference?: string;
  },
) {
  if (!context.agencyId) fail(403, "FORBIDDEN", "Agency context is required");
  if (input.amount <= 0)
    fail(400, "INVALID_REQUEST", "Settlement amount must be positive");
  const agencyId = context.agencyId;
  if (input.party === "OPERATOR" && input.partyId !== agencyId)
    fail(
      403,
      "FORBIDDEN",
      "Operator settlements must target the trip-owning agency",
    );
  if (input.party === "AGENT") {
    const agent = await prisma.user.findFirst({
      where: {
        id: input.partyId,
        agencyId,
        ...(isBranchScoped(context)
          ? { branchId: context.branchId ?? "__missing__" }
          : {}),
      },
      select: { id: true },
    });
    if (!agent) fail(404, "NOT_FOUND", "Agent not found in this agency");
  }
  if (isBranchScoped(context) && !context.branchId)
    fail(403, "FORBIDDEN", "Assign your account to a branch first");
  const branchId = isBranchScoped(context) ? context.branchId : null;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Agency" WHERE id = ${agencyId} FOR UPDATE`;
    const balance = await tx.financeLedger.aggregate({
      where: {
        agencyId,
        party: input.party,
        partyId: input.partyId,
        ...(branchId ? { branchId } : {}),
      },
      _sum: { amount: true },
    });
    const overallBalance = branchId
      ? await tx.financeLedger.aggregate({
          where: { agencyId, party: input.party, partyId: input.partyId },
          _sum: { amount: true },
        })
      : balance;
    const available = Math.min(
      Number(balance._sum.amount ?? 0),
      Number(overallBalance._sum.amount ?? 0),
    );
    if (input.amount > available + 0.001)
      fail(
        409,
        "SETTLEMENT_LIMIT",
        "Settlement exceeds the available party balance",
      );
    const settlement = await tx.settlement.create({
      data: {
        agencyId,
        branchId,
        ...input,
        reference: input.reference || null,
        recordedById: context.userId,
      },
    });
    await tx.financeLedger.create({
      data: {
        agencyId,
        branchId,
        type: "SETTLEMENT",
        party: input.party,
        partyId: input.partyId,
        amount: -input.amount,
        description: `${input.party.toLowerCase()} settlement posted`,
      },
    });
    await tx.auditLog.create({
      data: {
        agencyId,
        actorId: context.userId,
        action: "SETTLEMENT_POSTED",
        entityType: "Settlement",
        entityId: settlement.id,
        details: {
          amount: input.amount,
          party: input.party,
          partyId: input.partyId,
        },
      },
    });
    return settlement;
  });
}
export async function listLedger(
  context: AuthContext,
  from?: string,
  to?: string,
  filters: {
    agencyId?: string;
    branchId?: string;
    agentId?: string;
    tripId?: string;
  } = {},
) {
  if (
    isBranchScoped(context) &&
    filters.branchId &&
    filters.branchId !== context.branchId
  )
    fail(
      403,
      "FORBIDDEN",
      "You can only view the ledger of your assigned branch",
    );
  const agencyId =
    context.role === "SUPER_ADMIN"
      ? filters.agencyId
      : (context.agencyId ?? "__missing__");
  const branchId = isBranchScoped(context)
    ? (context.branchId ?? "__missing__")
    : filters.branchId;
  return prisma.financeLedger.findMany({
    where: {
      ...(agencyId ? { agencyId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(filters.agentId || filters.tripId
        ? {
            booking: {
              ...(filters.agentId ? { bookedById: filters.agentId } : {}),
              ...(filters.tripId ? { tripId: filters.tripId } : {}),
            },
          }
        : {}),
    },
    include: {
      booking: { select: { pnr: true, branchId: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}
export async function listFinancePeople(
  context: AuthContext,
  requestedAgencyId?: string,
) {
  const agencyId =
    context.role === "SUPER_ADMIN" ? requestedAgencyId : context.agencyId;
  if (!agencyId) fail(400, "INVALID_REQUEST", "Select an agency first");
  if (
    context.role !== "SUPER_ADMIN" &&
    requestedAgencyId &&
    requestedAgencyId !== agencyId
  )
    fail(403, "FORBIDDEN", "You cannot access another agency");
  return prisma.user.findMany({
    where: {
      agencyId,
      status: "ACTIVE",
      ...(isBranchScoped(context)
        ? { branchId: context.branchId ?? "__missing__" }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, branchId: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}
export async function getReports(
  context: AuthContext,
  from?: string,
  to?: string,
  filters: {
    agencyId?: string;
    branchId?: string;
    agentId?: string;
    tripId?: string;
  } = {},
  options: {
    page?: number;
    limit?: number;
    allBookings?: boolean;
    timezone?: string;
    search?: string;
    status?: BookingStatus;
  } = {},
) {
  const agencyId =
    context.role === "SUPER_ADMIN"
      ? filters.agencyId
      : (context.agencyId ?? "__missing__");
  if (
    isBranchScoped(context) &&
    filters.branchId &&
    filters.branchId !== context.branchId
  )
    fail(403, "FORBIDDEN", "You can only report on your assigned branch");
  const branchId = isBranchScoped(context)
    ? (context.branchId ?? "__missing__")
    : filters.branchId;
  const agentId = filters.agentId;
  const scope = {
    ...(agencyId ? { agencyId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(agentId ? { bookedById: agentId } : {}),
    ...(filters.tripId ? { tripId: filters.tripId } : {}),
  };
  const tripScope = {
    ...(agencyId ? { agencyId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(filters.tripId ? { id: filters.tripId } : {}),
  };
  const createdAt = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
  };
  const travelDate = {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
  };
  const tripPeriod = { ...tripScope, ...(from || to ? { travelDate } : {}) };
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const bookingWhere = {
    ...scope,
    createdAt,
    ...(options.search
      ? { pnr: { contains: options.search, mode: "insensitive" as const } }
      : {}),
    ...(options.status ? { status: options.status } : {}),
  };
  const [
    bookings,
    payments,
    refunds,
    seats,
    capacityRows,
    ledger,
    commissions,
    summary,
    total,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: bookingWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(options.allBookings ? {} : { skip: (page - 1) * limit, take: limit }),
      select: {
        id: true,
        pnr: true,
        branchId: true,
        status: true,
        totalAmount: true,
        taxAmount: true,
        commissionAmount: true,
        createdAt: true,
        refunds: { select: { amount: true } },
        cancellation: { select: { eligibleRefund: true, feeAmount: true } },
      },
    }),
    prisma.paymentRecord.aggregate({
      where: {
        ...(agencyId ? { agencyId } : {}),
        receivedAt: createdAt,
        booking: scope,
      },
      _sum: { amount: true },
    }),
    prisma.refundRecord.aggregate({
      where: {
        ...(agencyId ? { agencyId } : {}),
        refundedAt: createdAt,
        booking: scope,
      },
      _sum: { amount: true },
    }),
    prisma.tripSeat.count({ where: { status: "BOOKED", trip: tripPeriod } }),
    prisma.$queryRaw<{ capacity: bigint }[]>(Prisma.sql`
        SELECT COALESCE(SUM(GREATEST(0, b."totalSeats" - COALESCE(cardinality(l."disabledSeats"), 0))), 0)::bigint AS capacity
        FROM "Trip" t JOIN "Bus" b ON b.id = t."busId" LEFT JOIN "BusSeatLayout" l ON l."busId" = b.id
        WHERE ${Prisma.join(
          [
            Prisma.sql`TRUE`,
            ...(agencyId ? [Prisma.sql`t."agencyId" = ${agencyId}`] : []),
            ...(branchId ? [Prisma.sql`t."branchId" = ${branchId}`] : []),
            ...(filters.tripId ? [Prisma.sql`t.id = ${filters.tripId}`] : []),
            ...(from
              ? [
                  Prisma.sql`t."travelDate" >= ${new Date(`${from}T00:00:00.000Z`)}`,
                ]
              : []),
            ...(to
              ? [
                  Prisma.sql`t."travelDate" <= ${new Date(`${to}T00:00:00.000Z`)}`,
                ]
              : []),
          ],
          " AND ",
        )}`),
    listLedger(context, from, to, filters),
    prisma.agentCommission.aggregate({
      where: {
        ...(agencyId ? { agencyId } : {}),
        booking: { ...scope, createdAt },
      },
      _sum: { amount: true, reversedAmount: true },
    }),
    financeBookingSummary(scope, from, to, options.timezone),
    prisma.booking.count({ where: bookingWhere }),
  ]);
  const sold = seats;
  const capacity = Number(capacityRows[0]?.capacity ?? 0);

  return {
    totals: {
      bookings: summary.branches.reduce((sum, branch) => sum + branch.count, 0),
      revenue: payments._sum.amount ?? 0,
      refunds: refunds._sum.amount ?? 0,
      cancellations: summary.branches.reduce(
        (sum, branch) => sum + branch.cancellations,
        0,
      ),
      commission:
        Number(commissions._sum.amount ?? 0) -
        Number(commissions._sum.reversedAmount ?? 0),
      occupancyPercent: capacity
        ? Math.round((sold / capacity) * 10000) / 100
        : 0,
    },
    bookings,
    ledger,
    ...summary,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
