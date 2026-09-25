import { Prisma, type DiscountType } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { canAccessTenant } from "../middleware/tenant-policy.js";

type Err = Error & { statusCode?: number; code?: string };
function fail(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as Err;
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}
function assertAccess(
  context: AuthContext,
  agencyId: string,
  branchId: string,
) {
  if (!canAccessTenant(context, agencyId, branchId))
    fail(403, "FORBIDDEN", "You do not have access to this trip");
}
function seatName(index: number, columns: number) {
  return `${String.fromCharCode(65 + Math.floor(index / columns))}${(index % columns) + 1}`;
}
async function loadTrip(context: AuthContext, tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      route: {
        include: {
          stops: {
            where: { status: "ACTIVE", points: { some: { status: "ACTIVE" } } },
            include: { points: { where: { status: "ACTIVE" } } },
            orderBy: { sequence: "asc" },
          },
        },
      },
      bus: { include: { seatLayout: true } },
      branch: true,
      agency: true,
    },
  });
  if (!trip) fail(404, "NOT_FOUND", "Trip not found");
  assertAccess(context, trip.agencyId, trip.branchId);
  if (
    trip.status !== "SCHEDULED" ||
    trip.departureTime <= new Date() ||
    trip.bus.status !== "ACTIVE" ||
    trip.branch.status !== "ACTIVE" ||
    trip.agency.status !== "ACTIVE"
  )
    fail(
      409,
      "TRIP_UNAVAILABLE",
      "This trip is no longer available for booking",
    );
  return trip;
}
function seatsFor(bus: {
  totalSeats: number;
  seatLayout: { columns: number; rows: number; disabledSeats: string[]; seatDetails?: Prisma.JsonValue } | null;
}) {
  const columns = bus.seatLayout?.columns ?? 4;
  const names = Array.from({ length: bus.totalSeats }, (_, i) =>
    seatName(i, columns),
  );
  return {
    names: names.filter(
      (name) => !bus.seatLayout?.disabledSeats.includes(name),
    ),
    columns,
    rows: bus.seatLayout?.rows ?? Math.ceil(bus.totalSeats / columns),
    seatDetails: bus.seatLayout?.seatDetails && typeof bus.seatLayout.seatDetails === "object" && !Array.isArray(bus.seatLayout.seatDetails)
      ? bus.seatLayout.seatDetails as Record<string, { type?: string; restriction?: string }>
      : {},
  };
}
async function ensureInventory(
  tx: Prisma.TransactionClient,
  tripId: string,
  names: string[],
) {
  await tx.tripSeat.createMany({
    data: names.map((seatName) => ({ tripId, seatName })),
    skipDuplicates: true,
  });
}

export async function searchTrips(
  context: AuthContext,
  query: { source?: string; destination?: string; date?: string },
) {
  if (!query.source || !query.destination || !query.date)
    fail(400, "INVALID_REQUEST", "Source, destination, and date are required");
  const date = new Date(`${query.date}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()))
    fail(400, "INVALID_REQUEST", "Travel date is invalid");
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const trips = await prisma.trip.findMany({
    where: {
      status: "SCHEDULED",
      departureTime: { gt: new Date() },
      bus: { status: "ACTIVE" },
      branch: { status: "ACTIVE" },
      agency: { status: "ACTIVE" },
      travelDate: { gte: date, lt: nextDate },
      ...(context.role === "SUPER_ADMIN"
        ? {}
        : {
            agencyId: context.agencyId ?? "__missing__",
            ...(context.role === "AGENT" || context.role === "BRANCH_ADMIN"
              ? { branchId: context.branchId ?? "__missing__" }
              : {}),
          }),
      route: {
        source: { contains: query.source, mode: "insensitive" },
        destination: { contains: query.destination, mode: "insensitive" },
      },
    },
    include: {
      route: true,
      bus: { include: { seatLayout: true } },
      branch: true,
    },
    orderBy: { departureTime: "asc" },
  });
  const available = await Promise.all(
    trips.map(async (trip) => {
      const { names } = seatsFor(trip.bus);
      const [booked, held] = await Promise.all([
        prisma.tripSeat.count({ where: { tripId: trip.id, status: "BOOKED" } }),
        prisma.tripSeat.count({
          where: {
            tripId: trip.id,
            status: "HELD",
            holdExpiresAt: { gt: new Date() },
          },
        }),
      ]);
      return {
        ...trip,
        availableSeats: Math.max(0, names.length - booked - held),
      };
    }),
  );
  return available;
}

export async function tripAvailability(context: AuthContext, tripId: string) {
  const trip = await loadTrip(context, tripId);
  const { names, rows, columns, seatDetails } = seatsFor(trip.bus);
  const now = new Date();
  await prisma.tripSeat.updateMany({
    where: { tripId, status: "HELD", holdExpiresAt: { lte: now } },
    data: {
      status: "AVAILABLE",
      holdToken: null,
      heldById: null,
      holdExpiresAt: null,
    },
  });
  await prisma.$transaction((tx) => ensureInventory(tx, tripId, names));
  const inventory = await prisma.tripSeat.findMany({
    where: { tripId, seatName: { in: names } },
    select: { seatName: true, status: true, holdExpiresAt: true },
  });
  return {
    trip,
    rows,
    columns,
    seats: names.map((name) => {
      const item = inventory.find((entry) => entry.seatName === name);
      return {
        name,
        type: seatDetails[name]?.type ?? "SINGLE",
        restriction: seatDetails[name]?.restriction ?? "ALL",
        status: item?.status ?? "AVAILABLE",
        holdExpiresAt: item?.holdExpiresAt ?? null,
      };
    }),
    discountCap: {
      type: trip.agency.maxDiscountType,
      value: Number(trip.agency.maxDiscountValue),
    },
  };
}

export async function saveSeatLayout(
  context: AuthContext,
  busId: string,
  input: { rows: number; columns: number; disabledSeats: string[]; seatDetails?: Record<string, { type: string; restriction: string }> },
) {
  const bus = await prisma.bus.findUnique({ where: { id: busId } });
  if (!bus) fail(404, "NOT_FOUND", "Bus not found");
  assertAccess(context, bus.agencyId, bus.branchId);
  if (context.role === "AGENT")
    fail(
      403,
      "FORBIDDEN",
      "Only workspace administrators can update seat layouts",
    );
  const validNames = Array.from({ length: bus.totalSeats }, (_, i) =>
    seatName(i, input.columns),
  );
  if (input.disabledSeats.some((name) => !validNames.includes(name)))
    fail(
      400,
      "INVALID_REQUEST",
      "Disabled seats must belong to this bus layout",
    );
  return prisma.busSeatLayout.upsert({
    where: { busId },
    create: { busId, ...input },
    update: input,
  });
}

export async function getSeatLayout(context: AuthContext, busId: string) {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: { seatLayout: true },
  });
  if (!bus) fail(404, "NOT_FOUND", "Bus not found");
  assertAccess(context, bus.agencyId, bus.branchId);
  return (
    bus.seatLayout ?? {
      rows: Math.ceil(bus.totalSeats / 4),
      columns: 4,
      disabledSeats: [],
      seatDetails: {},
    }
  );
}

export async function getDiscountCap(context: AuthContext) {
  if (!context.agencyId)
    fail(400, "INVALID_REQUEST", "Select an agency workspace first");
  const agency = await prisma.agency.findUnique({
    where: { id: context.agencyId },
    select: { maxDiscountType: true, maxDiscountValue: true },
  });
  if (!agency) fail(404, "NOT_FOUND", "Agency not found");
  return {
    type: agency.maxDiscountType,
    value: Number(agency.maxDiscountValue),
  };
}

export async function updateDiscountCap(
  context: AuthContext,
  input: { type: DiscountType; value: number },
) {
  if (!context.agencyId)
    fail(400, "INVALID_REQUEST", "Select an agency workspace first");
  if (context.role !== "AGENCY_ADMIN")
    fail(
      403,
      "FORBIDDEN",
      "Only agency administrators can change the discount cap",
    );
  const agency = await prisma.agency.update({
    where: { id: context.agencyId },
    data: { maxDiscountType: input.type, maxDiscountValue: input.value },
    select: { maxDiscountType: true, maxDiscountValue: true },
  });
  return {
    type: agency.maxDiscountType,
    value: Number(agency.maxDiscountValue),
  };
}

export async function holdSeats(
  context: AuthContext,
  input: { tripId: string; seats: string[]; holdToken?: string },
) {
  if (!input.seats.length || new Set(input.seats).size !== input.seats.length)
    fail(400, "INVALID_REQUEST", "Select one or more unique seats");
  const trip = await loadTrip(context, input.tripId);
  const { names } = seatsFor(trip.bus);
  if (input.seats.some((name) => !names.includes(name)))
    fail(400, "INVALID_REQUEST", "One or more seats are not part of this trip");
  const holdToken = input.holdToken ?? randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  try {
    await prisma.$transaction(
      async (tx) => {
        await ensureInventory(tx, trip.id, names);
        await tx.$queryRaw`SELECT id FROM "TripSeat" WHERE "tripId" = ${trip.id} AND "seatName" IN (${Prisma.join(input.seats)}) FOR UPDATE`;
        const rows = await tx.tripSeat.findMany({
          where: { tripId: trip.id, seatName: { in: input.seats } },
        });
        if (
          rows.some(
            (seat) =>
              seat.status === "BOOKED" ||
              (seat.status === "HELD" &&
                seat.holdExpiresAt &&
                seat.holdExpiresAt > new Date() &&
                seat.holdToken !== holdToken),
          )
        )
          fail(
            409,
            "SEAT_UNAVAILABLE",
            "One or more selected seats are no longer available",
          );
        await tx.tripSeat.updateMany({
          where: { tripId: trip.id, seatName: { in: input.seats } },
          data: {
            status: "HELD",
            holdToken,
            heldById: context.userId,
            holdExpiresAt: expiresAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if ((error as Err).statusCode || (error as Err).code === "SEAT_UNAVAILABLE")
      throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      fail(
        409,
        "SEAT_UNAVAILABLE",
        "Seats changed while you were selecting them. Refresh availability and try again.",
      );
    throw error;
  }
  return { holdToken, expiresAt };
}

export async function releaseHold(context: AuthContext, token: string) {
  await prisma.tripSeat.updateMany({
    where: { holdToken: token, heldById: context.userId, status: "HELD" },
    data: {
      status: "AVAILABLE",
      holdToken: null,
      heldById: null,
      holdExpiresAt: null,
    },
  });
  return { released: true };
}

export async function confirmBooking(
  context: AuthContext,
  input: {
    tripId: string;
    holdToken: string;
    idempotencyKey: string;
    boardingStopId: string;
    dropOffStopId: string;
    discountType?: DiscountType;
    discountValue?: number;
    passengers: {
      seatName: string;
      firstName: string;
      lastName: string;
      age: number;
      gender: string;
      phone: string;
      email?: string;
      documentType?: string;
      documentReference?: string;
    }[];
  },
) {
  const existing = await prisma.booking.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: {
      trip: { include: { route: true, bus: true } },
      passengers: true,
      boardingStop: true,
      dropOffStop: true,
    },
  });
  if (existing) {
    assertAccess(context, existing.agencyId, existing.branchId);
    return existing;
  }
  const trip = await loadTrip(context, input.tripId);
  if (
    !input.passengers.length ||
    new Set(input.passengers.map((p) => p.seatName)).size !==
      input.passengers.length
  )
    fail(400, "INVALID_REQUEST", "Each selected seat needs one passenger");
  const routeStops = trip.route.stops;
  const boarding = routeStops.find(
    (stop) =>
      stop.id === input.boardingStopId &&
      stop.points.some(
        (point) => point.pointType === "BOARDING" || point.pointType === "BOTH",
      ),
  );
  const dropoff = routeStops.find(
    (stop) =>
      stop.id === input.dropOffStopId &&
      stop.points.some(
        (point) => point.pointType === "DROP_OFF" || point.pointType === "BOTH",
      ),
  );
  if (!boarding || !dropoff || boarding.sequence >= dropoff.sequence)
    fail(
      400,
      "INVALID_REQUEST",
      "Choose valid boarding and drop-off points in route order",
    );
  const expectedSeats = input.passengers.map((p) => p.seatName).sort();
  const baseFare = Number(trip.fare) * expectedSeats.length;
  const discountType = input.discountType;
  const discountValue = input.discountValue ?? 0;
  if (
    discountValue < 0 ||
    (discountType === "PERCENTAGE" && discountValue > 100)
  )
    fail(400, "INVALID_DISCOUNT", "Discount value is invalid");
  const cap = Number(trip.agency.maxDiscountValue);
  if (
    discountType &&
    (discountType !== trip.agency.maxDiscountType || discountValue > cap)
  )
    fail(
      400,
      "DISCOUNT_CAP_EXCEEDED",
      `Discount must use ${trip.agency.maxDiscountType.toLowerCase()} and stay within the agency limit`,
    );
  const discountAmount =
    discountType === "PERCENTAGE"
      ? Math.round(baseFare * discountValue) / 100
      : discountType === "FIXED"
        ? discountValue
        : 0;
  if (discountAmount > baseFare)
    fail(400, "INVALID_DISCOUNT", "Discount cannot exceed the fare");
  const pnr = `A1${randomBytes(5).toString("hex").toUpperCase()}`;
  const now = new Date();
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "TripSeat" WHERE "tripId" = ${trip.id} AND "seatName" IN (${Prisma.join(expectedSeats)}) FOR UPDATE`;
        const seats = await tx.tripSeat.findMany({
          where: { tripId: trip.id, seatName: { in: expectedSeats } },
        });
        if (
          seats.length !== expectedSeats.length ||
          seats.some(
            (seat) =>
              seat.status !== "HELD" ||
              seat.holdToken !== input.holdToken ||
              seat.heldById !== context.userId ||
              !seat.holdExpiresAt ||
              seat.holdExpiresAt <= now,
          )
        )
          fail(
            409,
            "HOLD_EXPIRED",
            "Your seat hold has expired. Select the seats again.",
          );
        const holdSeatCount = await tx.tripSeat.count({
          where: {
            tripId: trip.id,
            holdToken: input.holdToken,
            status: "HELD",
            heldById: context.userId,
          },
        });
        if (holdSeatCount !== expectedSeats.length)
          fail(
            409,
            "HOLD_CHANGED",
            "The held seats changed. Refresh availability and select again.",
          );
        const booking = await tx.booking.create({
          data: {
            pnr,
            idempotencyKey: input.idempotencyKey,
            holdToken: input.holdToken,
            agencyId: trip.agencyId,
            branchId: trip.branchId,
            tripId: trip.id,
            bookedById: context.userId,
            boardingStopId: boarding.id,
            dropOffStopId: dropoff.id,
            baseFare,
            discountType,
            discountValue,
            discountAmount,
            totalAmount: baseFare - discountAmount,
            passengers: {
              create: input.passengers.map((passenger) => ({
                ...passenger,
                email: passenger.email || null,
                documentType: passenger.documentType || null,
                documentReference: passenger.documentReference || null,
              })),
            },
          },
          include: {
            passengers: true,
            trip: { include: { route: true, bus: true } },
            boardingStop: true,
            dropOffStop: true,
          },
        });
        await tx.tripSeat.updateMany({
          where: {
            tripId: trip.id,
            seatName: { in: expectedSeats },
            holdToken: input.holdToken,
          },
          data: {
            status: "BOOKED",
            bookingId: booking.id,
            holdExpiresAt: null,
          },
        });
        return booking;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if ((error as Err).statusCode) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const retried = await prisma.booking.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          passengers: true,
          trip: { include: { route: true, bus: true } },
          boardingStop: true,
          dropOffStop: true,
        },
      });
      if (retried) return retried;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      fail(
        409,
        "BOOKING_CONFLICT",
        "Booking could not be completed. Refresh seat availability and try again.",
      );
    throw error;
  }
}

export async function getBookingByPnr(context: AuthContext, pnr: string) {
  const booking = await prisma.booking.findUnique({
    where: { pnr: pnr.toUpperCase() },
    include: {
      passengers: true,
      trip: { include: { route: true, bus: true, branch: true } },
      boardingStop: true,
      dropOffStop: true,
    },
  });
  if (!booking) fail(404, "NOT_FOUND", "Booking not found");
  assertAccess(context, booking.agencyId, booking.branchId);
  return booking;
}

export async function listBookings(
  context: AuthContext,
  query: {
    page: number;
    limit: number;
    pnr?: string;
    tripCode?: string;
    date?: string;
  },
) {
  const page = Math.max(1, query.page);
  const limit = Math.min(100, Math.max(1, query.limit));
  let travelDate: { gte: Date; lt: Date } | undefined;
  if (query.date) {
    const start = new Date(`${query.date}T00:00:00.000Z`);
    if (!Number.isFinite(start.getTime()))
      fail(400, "INVALID_REQUEST", "Travel date is invalid");
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    travelDate = { gte: start, lt: end };
  }
  const where: Prisma.BookingWhereInput = {
    ...(context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(context.role === "AGENT" || context.role === "BRANCH_ADMIN"
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        }),
    ...(query.pnr
      ? { pnr: { contains: query.pnr.trim(), mode: "insensitive" } }
      : {}),
    ...(query.tripCode
      ? {
          trip: {
            tripCode: { contains: query.tripCode.trim(), mode: "insensitive" },
          },
        }
      : {}),
    ...(travelDate
      ? {
          trip: {
            ...(query.tripCode
              ? {
                  tripCode: {
                    contains: query.tripCode.trim(),
                    mode: "insensitive",
                  },
                }
              : {}),
            travelDate,
          },
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        passengers: true,
        trip: { include: { route: true, bus: true, branch: true } },
        boardingStop: true,
        dropOffStop: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getBookingDashboardSummary(context: AuthContext) {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
  const scope: Prisma.BookingWhereInput =
    context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(context.role === "AGENT" || context.role === "BRANCH_ADMIN"
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        };
  const todayWhere: Prisma.BookingWhereInput = {
    ...scope,
    createdAt: { gte: startOfDay, lt: endOfDay },
  };
  const tripScope: Prisma.TripWhereInput =
    context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(context.role === "AGENT" || context.role === "BRANCH_ADMIN"
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        };
  const [todayBookings, sales, upcomingTrips] = await Promise.all([
    prisma.booking.count({ where: todayWhere }),
    prisma.booking.aggregate({
      where: todayWhere,
      _sum: { totalAmount: true },
    }),
    prisma.trip.count({
      where: {
        ...tripScope,
        status: "SCHEDULED",
        departureTime: { gt: now },
        agency: { status: "ACTIVE" },
        branch: { status: "ACTIVE" },
        bus: { status: "ACTIVE" },
      },
    }),
  ]);
  return {
    todayBookings,
    todaySales: Number(sales._sum.totalAmount ?? 0),
    upcomingTrips,
  };
}
