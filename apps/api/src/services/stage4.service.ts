import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { FinanceMethod } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { environment } from "../config/env.js";
import type { AuthContext } from "../types/auth.js";
import { canAccessTenant } from "../middleware/tenant-policy.js";
import { sendEmail } from "./email.service.js";
import { cancelBooking } from "./finance.service.js";

type Err = Error & { statusCode?: number; code?: string };
function fail(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as Err;
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}
const agencyScope = (context: AuthContext) =>
  context.role === "SUPER_ADMIN"
    ? {}
    : { agencyId: context.agencyId ?? "__missing__" };

export async function audit(
  context: AuthContext,
  agencyId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details: Prisma.InputJsonValue = {},
) {
  await prisma.auditLog.create({
    data: {
      agencyId,
      actorId: context.userId,
      action,
      entityType,
      entityId,
      details,
    },
  });
}

export async function postProviderMessage(
  endpoint: string,
  token: string,
  channel: "SMS" | "WHATSAPP",
  to: string,
  subject: string,
  message: string,
  request: (input: string, init: RequestInit) => Promise<Response> = (
    input,
    init,
  ) => fetch(input, init),
) {
  const response = await request(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to,
      subject,
      message,
      channel: channel.toLowerCase(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`${channel} provider returned HTTP ${response.status}`);
}

async function deliver(
  channel: "EMAIL" | "SMS" | "WHATSAPP",
  to: string,
  subject: string,
  message: string,
) {
  if (channel === "EMAIL") {
    await sendEmail({
      to,
      subject,
      text: message,
      html: `<p>${message.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</p>`,
    });
    return;
  }
  const endpoint =
    channel === "SMS"
      ? environment.SMS_PROVIDER_URL
      : environment.WHATSAPP_PROVIDER_URL;
  const token =
    channel === "SMS"
      ? environment.SMS_PROVIDER_TOKEN
      : environment.WHATSAPP_PROVIDER_TOKEN;
  if (!endpoint || !token)
    throw new Error(`${channel} provider is not configured`);
  await postProviderMessage(endpoint, token, channel, to, subject, message);
}

export async function sendBookingNotifications(
  bookingId: string,
  event: "BOOKING_CONFIRMED" | "CANCELLATION_APPROVED",
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { passengers: true, trip: { include: { route: true } } },
  });
  if (!booking) return;
  const text =
    event === "BOOKING_CONFIRMED"
      ? `Booking ${booking.pnr} confirmed for ${booking.trip.route.source} to ${booking.trip.route.destination}. Amount due: ${booking.currency} ${booking.totalAmount}.`
      : `Booking ${booking.pnr} has been cancelled. Contact your agency regarding the refund due.`;
  const user = await prisma.user.findUnique({
    where: { id: booking.bookedById },
    include: { notificationPreference: true },
  });
  const preferences = user?.notificationPreference ?? {
    inApp: true,
    email: true,
    sms: false,
    whatsapp: false,
  };
  const tasks: Promise<unknown>[] = [];
  if (user && preferences.inApp)
    tasks.push(
      prisma.notification.create({
        data: {
          agencyId: booking.agencyId,
          userId: user.id,
          bookingId,
          channel: "IN_APP",
          status: "SENT",
          recipient: user.email,
          subject: event,
          message: text,
          sentAt: new Date(),
        },
      }),
    );
  for (const passenger of booking.passengers) {
    const channels: Array<
      ["EMAIL" | "SMS" | "WHATSAPP", string | null, boolean]
    > = [
      ["EMAIL", passenger.email, preferences.email],
      ["SMS", passenger.phone, preferences.sms],
      ["WHATSAPP", passenger.phone, preferences.whatsapp],
    ];
    for (const [channel, to, enabled] of channels) {
      if (!to || !enabled) continue;
      tasks.push(
        (async () => {
          const record = await prisma.notification.create({
            data: {
              agencyId: booking.agencyId,
              bookingId,
              channel,
              recipient: to,
              subject: event,
              message: text,
            },
          });
          try {
            await deliver(channel, to, event, text);
            await prisma.notification.update({
              where: { id: record.id },
              data: { status: "SENT", sentAt: new Date() },
            });
          } catch (error) {
            await prisma.notification.update({
              where: { id: record.id },
              data: {
                status: "FAILED",
                error:
                  error instanceof Error
                    ? error.message.slice(0, 500)
                    : "Delivery failed",
              },
            });
          }
        })(),
      );
    }
  }
  await Promise.allSettled(tasks);
}

export async function getPreferences(context: AuthContext) {
  return prisma.notificationPreference.upsert({
    where: { userId: context.userId },
    create: { userId: context.userId },
    update: {},
  });
}
export async function updatePreferences(
  context: AuthContext,
  input: { inApp: boolean; email: boolean; sms: boolean; whatsapp: boolean },
) {
  return prisma.notificationPreference.upsert({
    where: { userId: context.userId },
    create: { userId: context.userId, ...input },
    update: input,
  });
}
export async function listNotifications(context: AuthContext) {
  return prisma.notification.findMany({
    where: {
      agencyId: context.agencyId ?? "__missing__",
      OR: [{ userId: context.userId }, { channel: "IN_APP", userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
export async function markNotificationRead(context: AuthContext, id: string) {
  const item = await prisma.notification.findFirst({
    where: {
      id,
      agencyId: context.agencyId ?? "__missing__",
      userId: context.userId,
      channel: "IN_APP",
    },
  });
  if (!item) fail(404, "NOT_FOUND", "Notification not found");
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

async function loadBooking(context: AuthContext, id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) fail(404, "NOT_FOUND", "Booking not found");
  if (!canAccessTenant(context, booking.agencyId, booking.branchId))
    fail(403, "FORBIDDEN", "You do not have access to this booking");
  return booking;
}
export async function requestCancellation(
  context: AuthContext,
  bookingId: string,
  reason?: string,
) {
  const booking = await loadBooking(context, bookingId);
  if (booking.status !== "CONFIRMED")
    fail(409, "BOOKING_CLOSED", "Only confirmed bookings can be cancelled");
  const previous = await prisma.cancellationRequest.findUnique({
    where: { bookingId },
  });
  if (previous?.status === "PENDING")
    fail(409, "REQUEST_PENDING", "A cancellation request is already pending");
  const request = await prisma.cancellationRequest.upsert({
    where: { bookingId },
    create: {
      agencyId: booking.agencyId,
      bookingId,
      requestedBy: context.userId,
      reason: reason?.trim() || null,
    },
    update: {
      requestedBy: context.userId,
      reason: reason?.trim() || null,
      status: "PENDING",
      reviewedBy: null,
      reviewNote: null,
      reviewedAt: null,
    },
  });
  await audit(
    context,
    booking.agencyId,
    "CANCELLATION_REQUESTED",
    "Booking",
    bookingId,
    { requestId: request.id },
  );
  const admins = await prisma.user.findMany({
    where: {
      agencyId: booking.agencyId,
      role: { code: "AGENCY_ADMIN" },
      status: "ACTIVE",
    },
    select: { id: true, email: true },
  });
  if (admins.length)
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        agencyId: booking.agencyId,
        userId: admin.id,
        bookingId,
        channel: "IN_APP" as const,
        status: "SENT" as const,
        recipient: admin.email,
        subject: "CANCELLATION_REQUESTED",
        message: `Cancellation requested for booking ${booking.pnr}.`,
        sentAt: new Date(),
      })),
    });
  return request;
}
export async function listCancellationRequests(context: AuthContext) {
  return prisma.cancellationRequest.findMany({
    where: {
      ...agencyScope(context),
      ...(context.role === "AGENT" || context.role === "BRANCH_ADMIN"
        ? { booking: { branchId: context.branchId ?? "__missing__" } }
        : {}),
      status: "PENDING",
    },
    include: {
      booking: {
        include: { passengers: true, trip: { include: { route: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
export async function reviewCancellation(
  context: AuthContext,
  id: string,
  input: { approve: boolean; note?: string },
) {
  if (context.role === "AGENT")
    fail(
      403,
      "FORBIDDEN",
      "Only workspace administrators can review cancellation requests",
    );
  const item = await prisma.cancellationRequest.findUnique({
    where: { id },
    include: { booking: true },
  });
  if (!item) fail(404, "NOT_FOUND", "Cancellation request not found");
  if (!canAccessTenant(context, item.agencyId, item.booking.branchId))
    fail(403, "FORBIDDEN", "You do not have access to this request");
  if (item.status !== "PENDING")
    fail(409, "REQUEST_CLOSED", "This request has already been reviewed");
  if (input.approve)
    await cancelBooking(context, item.bookingId, item.reason ?? undefined);
  const updated = await prisma.cancellationRequest.update({
    where: { id },
    data: {
      status: input.approve ? "APPROVED" : "REJECTED",
      reviewedBy: context.userId,
      reviewNote: input.note?.trim() || null,
      reviewedAt: new Date(),
    },
  });
  await audit(
    context,
    item.agencyId,
    input.approve ? "CANCELLATION_APPROVED" : "CANCELLATION_REJECTED",
    "Booking",
    item.bookingId,
    { requestId: id, note: input.note ?? null },
  );
  await prisma.notification.create({
    data: {
      agencyId: item.agencyId,
      userId: item.requestedBy,
      bookingId: item.bookingId,
      channel: "IN_APP",
      status: "SENT",
      recipient: item.requestedBy,
      subject: input.approve
        ? "CANCELLATION_APPROVED"
        : "CANCELLATION_REJECTED",
      message: input.approve
        ? `Your cancellation request for ${item.booking.pnr} was approved.`
        : `Your cancellation request for ${item.booking.pnr} was rejected.${input.note ? ` ${input.note}` : ""}`,
      sentAt: new Date(),
    },
  });
  if (input.approve)
    void sendBookingNotifications(
      item.bookingId,
      "CANCELLATION_APPROVED",
    ).catch((error) =>
      console.error("Cancellation notification failed", error),
    );
  return updated;
}

export async function getAgencySettings(context: AuthContext) {
  const agencyId = context.agencyId;
  if (!agencyId)
    fail(400, "INVALID_REQUEST", "Select an agency workspace first");
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      country: true,
      brandColor: true,
      logoUrl: true,
      currency: true,
      defaultFare: true,
    },
  });
  if (!agency) fail(404, "NOT_FOUND", "Agency not found");
  return agency;
}
export async function updateAgencySettings(
  context: AuthContext,
  input: {
    name: string;
    email?: string | null;
    phone?: string | null;
    brandColor: string;
    logoUrl?: string | null;
    currency: string;
    defaultFare: number;
  },
) {
  if (context.role !== "AGENCY_ADMIN" || !context.agencyId)
    fail(403, "FORBIDDEN", "Only agency admins can update workspace branding");
  const updated = await prisma.agency.update({
    where: { id: context.agencyId },
    data: {
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      brandColor: input.brandColor,
      logoUrl: input.logoUrl?.trim() || null,
      currency: input.currency,
      defaultFare: input.defaultFare,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      brandColor: true,
      logoUrl: true,
      currency: true,
      defaultFare: true,
    },
  });
  await audit(
    context,
    context.agencyId,
    "AGENCY_SETTINGS_UPDATED",
    "Agency",
    context.agencyId,
  );
  return updated;
}
export async function listAuditLogs(context: AuthContext) {
  return prisma.auditLog.findMany({
    where: agencyScope(context),
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getSubscription(context: AuthContext) {
  if (!context.agencyId)
    fail(400, "INVALID_REQUEST", "Select an agency workspace first");
  const record = await prisma.subscription.upsert({
    where: { agencyId: context.agencyId },
    create: {
      agencyId: context.agencyId,
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
    },
    update: {},
  });
  if (
    record.status === "TRIAL" &&
    record.trialEndsAt &&
    record.trialEndsAt < new Date()
  )
    return prisma.subscription.update({
      where: { agencyId: record.agencyId },
      data: { status: "PAST_DUE" },
    });
  return record;
}
export async function requestPlan(
  context: AuthContext,
  input: { planName: string; price: number },
) {
  if (context.role !== "AGENCY_ADMIN")
    fail(
      403,
      "FORBIDDEN",
      "Only agency admins can request a subscription plan",
    );
  if (!context.agencyId)
    fail(400, "INVALID_REQUEST", "Select an agency workspace first");
  const result = await prisma.subscription.upsert({
    where: { agencyId: context.agencyId },
    create: {
      agencyId: context.agencyId,
      requestedPlanName: input.planName.trim(),
      requestedPrice: input.price,
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
    },
    update: {
      requestedPlanName: input.planName.trim(),
      requestedPrice: input.price,
    },
  });
  await audit(
    context,
    context.agencyId,
    "PLAN_CHANGE_REQUESTED",
    "Subscription",
    result.id,
    { planName: input.planName, price: input.price },
  );
  return result;
}
export async function getAdminSubscription(
  context: AuthContext,
  agencyId: string,
) {
  if (context.role !== "SUPER_ADMIN")
    fail(403, "FORBIDDEN", "Only Super Admin can view tenant subscriptions");
  return prisma.subscription.findUnique({ where: { agencyId } });
}
export async function adminSubscription(
  context: AuthContext,
  agencyId: string,
  input: {
    planName: string;
    price: number;
    status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
    trialEndsAt?: string | null;
    periodEndsAt?: string | null;
  },
) {
  if (context.role !== "SUPER_ADMIN")
    fail(403, "FORBIDDEN", "Only Super Admin can manage subscription status");
  const result = await prisma.subscription.upsert({
    where: { agencyId },
    create: {
      agencyId,
      planName: input.planName,
      price: input.price,
      status: input.status,
      trialEndsAt: input.trialEndsAt ? new Date(input.trialEndsAt) : null,
      periodEndsAt: input.periodEndsAt ? new Date(input.periodEndsAt) : null,
    },
    update: {
      planName: input.planName,
      price: input.price,
      status: input.status,
      trialEndsAt: input.trialEndsAt ? new Date(input.trialEndsAt) : null,
      periodEndsAt: input.periodEndsAt ? new Date(input.periodEndsAt) : null,
      requestedPlanName: null,
      requestedPrice: null,
    },
  });
  await audit(
    context,
    agencyId,
    "SUBSCRIPTION_UPDATED",
    "Subscription",
    result.id,
    { status: input.status, planName: input.planName },
  );
  return result;
}
export async function invoices(
  context: AuthContext,
  requestedAgencyId?: string,
) {
  const agencyId =
    context.role === "SUPER_ADMIN" ? requestedAgencyId : context.agencyId;
  if (!agencyId)
    fail(400, "INVALID_REQUEST", "Select an agency before loading invoices");
  if (context.role !== "SUPER_ADMIN" && context.agencyId !== agencyId)
    fail(403, "FORBIDDEN", "You can only view your agency invoices");
  return prisma.subscriptionInvoice.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
  });
}
export async function createInvoice(
  context: AuthContext,
  input: {
    agencyId: string;
    description: string;
    amount: number;
    dueAt?: string;
  },
) {
  if (context.role !== "SUPER_ADMIN")
    fail(403, "FORBIDDEN", "Only Super Admin can create invoices");
  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      agencyId: input.agencyId,
      number: `INV-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`,
      description: input.description.trim(),
      amount: input.amount,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  await audit(
    context,
    input.agencyId,
    "INVOICE_CREATED",
    "SubscriptionInvoice",
    invoice.id,
    { number: invoice.number, amount: input.amount },
  );
  return invoice;
}
export async function markInvoicePaid(
  context: AuthContext,
  id: string,
  method: FinanceMethod,
  reference?: string,
) {
  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id },
  });
  if (!invoice) fail(404, "NOT_FOUND", "Invoice not found");
  if (
    context.role !== "SUPER_ADMIN" &&
    (context.role !== "AGENCY_ADMIN" || context.agencyId !== invoice.agencyId)
  )
    fail(
      403,
      "FORBIDDEN",
      "Only your agency administrator or Super Admin can record invoice payment",
    );
  if (invoice.status !== "OPEN")
    fail(409, "INVOICE_CLOSED", "Only open invoices can be marked paid");
  const updated = await prisma.subscriptionInvoice.update({
    where: { id },
    data: {
      status: "PAID",
      method,
      paidAt: new Date(),
      reference: reference?.trim() || null,
    },
  });
  await audit(
    context,
    invoice.agencyId,
    "INVOICE_MARKED_PAID",
    "SubscriptionInvoice",
    invoice.id,
    { method, reference: reference ?? null },
  );
  return updated;
}
