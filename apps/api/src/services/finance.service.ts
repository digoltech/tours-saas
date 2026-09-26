import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { canAccessTenant } from "../middleware/tenant-policy.js";
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
  if (context.role !== "AGENCY_ADMIN" && context.role !== "SUPER_ADMIN")
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
        bookingId,
        type: "PAYMENT",
        amount: input.amount,
        description: `Payment received for booking ${booking.pnr}`,
      },
    });
    await tx.auditLog.create({
      data: {
        agencyId: booking.agencyId,
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
        bookingId,
        type: "REFUND",
        amount: -input.amount,
        description: `Refund issued for booking ${booking.pnr}`,
      },
    });
    await tx.auditLog.create({
      data: {
        agencyId: booking.agencyId,
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
  if (context.role === "AGENT")
    fail(403, "FORBIDDEN", "Agents cannot post settlements");
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
        ...(context.role === "BRANCH_ADMIN"
          ? { branchId: context.branchId ?? "__missing__" }
          : {}),
      },
      select: { id: true },
    });
    if (!agent) fail(404, "NOT_FOUND", "Agent not found in this agency");
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Agency" WHERE id = ${agencyId} FOR UPDATE`;
    const balance = await tx.financeLedger.aggregate({
      where: { agencyId, party: input.party, partyId: input.partyId },
      _sum: { amount: true },
    });
    const available = Number(balance._sum.amount ?? 0);
    if (input.amount > available + 0.001)
      fail(
        409,
        "SETTLEMENT_LIMIT",
        "Settlement exceeds the available party balance",
      );
    const settlement = await tx.settlement.create({
      data: {
        agencyId,
        ...input,
        reference: input.reference || null,
        recordedById: context.userId,
      },
    });
    await tx.financeLedger.create({
      data: {
        agencyId,
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
export async function listLedger(context: AuthContext) {
  const where =
    context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(context.role === "BRANCH_ADMIN"
            ? { booking: { branchId: context.branchId ?? "__missing__" } }
            : context.role === "AGENT"
              ? {
                  booking: { bookedById: context.userId },
                  NOT: { party: "OPERATOR" as const },
                }
              : {}),
        };
  return prisma.financeLedger.findMany({
    where,
    include: { booking: { select: { pnr: true, branchId: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
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
) {
  const agencyId =
    context.role === "SUPER_ADMIN"
      ? filters.agencyId
      : (context.agencyId ?? "__missing__");
  if (
    context.role === "BRANCH_ADMIN" &&
    filters.branchId &&
    filters.branchId !== context.branchId
  )
    fail(403, "FORBIDDEN", "You can only report on your assigned branch");
  if (
    context.role === "AGENT" &&
    filters.branchId &&
    filters.branchId !== context.branchId
  )
    fail(403, "FORBIDDEN", "You can only report on your assigned branch");
  if (
    context.role === "AGENT" &&
    filters.agentId &&
    filters.agentId !== context.userId
  )
    fail(403, "FORBIDDEN", "You can only report on your own bookings");
  const branchId =
    context.role === "BRANCH_ADMIN" || context.role === "AGENT"
      ? (context.branchId ?? "__missing__")
      : filters.branchId;
  const agentId = context.role === "AGENT" ? context.userId : filters.agentId;
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
  const [bookings, payments, refunds, seats, trips, ledger] = await Promise.all(
    [
      prisma.booking.findMany({
        where: { ...scope, createdAt },
        include: {
          trip: { include: { bus: true } },
          refunds: true,
          cancellation: true,
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
      prisma.trip.findMany({
        where: tripPeriod,
        include: {
          bus: { include: { seatLayout: { select: { disabledSeats: true } } } },
          _count: { select: { seats: true } },
        },
      }),
      listLedger(context),
    ],
  );
  const sold = seats;
  const capacity = trips.reduce(
    (sum, t) =>
      sum +
      Math.max(
        0,
        t.bus.totalSeats - (t.bus.seatLayout?.disabledSeats.length ?? 0),
      ),
    0,
  );
  const commissions = await prisma.agentCommission.aggregate({
    where: {
      ...(agencyId ? { agencyId } : {}),
      booking: { ...scope, createdAt },
    },
    _sum: { amount: true, reversedAmount: true },
  });
  return {
    totals: {
      bookings: bookings.length,
      revenue: payments._sum.amount ?? 0,
      refunds: refunds._sum.amount ?? 0,
      cancellations: bookings.filter((b) => b.status === "CANCELLED").length,
      commission:
        Number(commissions._sum.amount ?? 0) -
        Number(commissions._sum.reversedAmount ?? 0),
      occupancyPercent: capacity
        ? Math.round((sold / capacity) * 10000) / 100
        : 0,
    },
    bookings,
    ledger,
  };
}
