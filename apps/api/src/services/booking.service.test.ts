import { beforeEach, describe, expect, mock, test } from "bun:test";

const state: {
  seats: Array<Record<string, unknown>>;
  bookings: Array<Record<string, unknown>>;
  serial: Promise<void>;
} = { seats: [], bookings: [], serial: Promise.resolve() };
const future = new Date("2099-06-01T12:00:00.000Z");
const stops = [
  {
    id: "stop-origin",
    name: "Origin",
    sequence: 1,
    status: "ACTIVE",
    points: [{ pointType: "BOARDING", status: "ACTIVE" }],
  },
  {
    id: "stop-destination",
    name: "Destination",
    sequence: 2,
    status: "ACTIVE",
    points: [{ pointType: "DROP_OFF", status: "ACTIVE" }],
  },
];
const trip = {
  id: "trip-1",
  agencyId: "agency-1",
  branchId: "branch-1",
  status: "SCHEDULED",
  fare: 100,
  travelDate: new Date("2099-06-01T00:00:00.000Z"),
  departureTime: future,
  route: { id: "route-1", source: "Origin", destination: "Destination", stops },
  bus: {
    id: "bus-1",
    totalSeats: 2,
    status: "ACTIVE",
    seatLayout: { columns: 2, rows: 1, disabledSeats: [] },
  },
  branch: { id: "branch-1", status: "ACTIVE" },
  agency: {
    id: "agency-1",
    status: "ACTIVE",
    maxDiscountType: "PERCENTAGE",
    maxDiscountValue: 20,
  },
};
const matches = (
  row: Record<string, unknown>,
  where: Record<string, unknown>,
) =>
  Object.entries(where).every(([key, value]) => {
    if (typeof value === "object" && value !== null) {
      const filter = value as { in?: unknown[]; lte?: Date; gt?: Date };
      if (filter.in) return filter.in.includes(row[key]);
      if (filter.lte)
        return new Date(String(row[key])).getTime() <= filter.lte.getTime();
      if (filter.gt)
        return new Date(String(row[key])).getTime() > filter.gt.getTime();
    }
    return row[key] === value;
  });

const tx = {
  $queryRaw: async () => [],
  tripSeat: {
    createMany: async ({
      data,
    }: {
      data: Array<{ tripId: string; seatName: string }>;
    }) => {
      for (const item of data)
        if (
          !state.seats.some(
            (seat) =>
              seat.tripId === item.tripId && seat.seatName === item.seatName,
          )
        )
          state.seats.push({
            ...item,
            id: "seat-" + item.seatName,
            status: "AVAILABLE",
            holdToken: null,
            heldById: null,
            holdExpiresAt: null,
            bookingId: null,
          });
      return { count: data.length };
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) =>
      state.seats.filter((seat) => matches(seat, where)),
    count: async ({ where }: { where: Record<string, unknown> }) =>
      state.seats.filter((seat) => matches(seat, where)).length,
    updateMany: async ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const rows = state.seats.filter((seat) => matches(seat, where));
      rows.forEach((seat) => Object.assign(seat, data));
      return { count: rows.length };
    },
  },
  booking: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const passengerData = data.passengers as { create: unknown[] };
      const record = {
        ...data,
        id: "booking-" + (state.bookings.length + 1),
        passengers: passengerData.create,
        trip: { ...trip, route: { ...trip.route, stops: undefined } },
        boardingStop: stops.find((stop) => stop.id === data.boardingStopId),
        dropOffStop: stops.find((stop) => stop.id === data.dropOffStopId),
      };
      state.bookings.push(record);
      return record;
    },
  },
};
const prisma = {
  trip: { findUnique: async () => trip },
  tripSeat: {
    updateMany: tx.tripSeat.updateMany,
    findMany: async ({ where }: { where: Record<string, unknown> }) =>
      state.seats.filter((seat) => matches(seat, where)),
  },
  booking: {
    findUnique: async ({ where }: { where: Record<string, string> }) =>
      state.bookings.find(
        (booking) =>
          (where.idempotencyKey &&
            booking.idempotencyKey === where.idempotencyKey) ||
          (where.pnr && booking.pnr === where.pnr),
      ) ?? null,
    count: async () => state.bookings.length,
    findMany: async () => state.bookings,
  },
  $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
    let unlock!: () => void;
    const gate = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const previous = state.serial;
    state.serial = previous.then(() => gate);
    await previous;
    try {
      return await work(tx);
    } finally {
      unlock();
    }
  },
};
mock.module("../config/prisma.js", () => ({ prisma }));
const {
  confirmBooking,
  getBookingByPnr,
  holdSeats,
  listBookings,
  tripAvailability,
} = await import("./booking.service.js");
const { releaseExpiredSeatHolds } =
  await import("./seat-hold-cleanup.service.js");

const agent = {
  userId: "agent-1",
  email: "agent@example.com",
  firstName: "Agent",
  lastName: "One",
  role: "AGENT" as const,
  agencyId: "agency-1",
  branchId: "branch-1",
  permissions: ["booking:read", "booking:create"],
};
const confirmInput = (
  holdToken: string,
  idempotencyKey: string,
  discountValue = 0,
) => ({
  tripId: "trip-1",
  holdToken,
  idempotencyKey,
  boardingStopId: "stop-origin",
  dropOffStopId: "stop-destination",
  ...(discountValue
    ? { discountType: "PERCENTAGE" as const, discountValue }
    : {}),
  passengers: [
    {
      seatName: "A1",
      firstName: "Riya",
      lastName: "Shah",
      age: 29,
      gender: "Female",
      phone: "9876543210",
    },
  ],
});

beforeEach(() => {
  state.seats = [];
  state.bookings = [];
  state.serial = Promise.resolve();
});
describe("booking service", () => {
  test("only one concurrent agent can hold the same seat", async () => {
    const results = await Promise.allSettled([
      holdSeats(agent, { tripId: trip.id, seats: ["A1"] }),
      holdSeats(agent, { tripId: trip.id, seats: ["A1"] }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejection = results.find(
      (result) => result.status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejection.reason.code).toBe("SEAT_UNAVAILABLE");
  });
  test("availability releases expired holds", async () => {
    state.seats = [
      {
        id: "seat-A1",
        tripId: trip.id,
        seatName: "A1",
        status: "HELD",
        holdToken: "old-token",
        heldById: "other-agent",
        holdExpiresAt: new Date(Date.now() - 1000),
      },
    ];
    const result = await tripAvailability(agent, trip.id);
    expect(result.seats.find((seat) => seat.name === "A1")?.status).toBe(
      "AVAILABLE",
    );
  });
  test("scheduled cleanup releases expired inventory", async () => {
    state.seats = [
      {
        id: "seat-A1",
        tripId: trip.id,
        seatName: "A1",
        status: "HELD",
        holdToken: "stale",
        heldById: "agent-old",
        holdExpiresAt: new Date(Date.now() - 1000),
      },
    ];
    const result = await releaseExpiredSeatHolds();
    expect(result.count).toBe(1);
    expect(state.seats[0]?.status).toBe("AVAILABLE");
  });
  test("rejects expired holds and another tenant", async () => {
    state.seats = [
      {
        id: "seat-A1",
        tripId: trip.id,
        seatName: "A1",
        status: "HELD",
        holdToken: "expired-token",
        heldById: agent.userId,
        holdExpiresAt: new Date(Date.now() - 1000),
      },
    ];
    await expect(
      confirmBooking(agent, confirmInput("expired-token", crypto.randomUUID())),
    ).rejects.toMatchObject({ code: "HOLD_EXPIRED" });
    const otherAgent = {
      ...agent,
      agencyId: "agency-other",
      branchId: "branch-other",
    };
    await expect(
      holdSeats(otherAgent, { tripId: trip.id, seats: ["A1"] }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  test("enforces discount caps and replays idempotent booking submissions", async () => {
    const hold = await holdSeats(agent, { tripId: trip.id, seats: ["A1"] });
    await expect(
      confirmBooking(
        agent,
        confirmInput(hold.holdToken, crypto.randomUUID(), 21),
      ),
    ).rejects.toMatchObject({ code: "DISCOUNT_CAP_EXCEEDED" });
    const key = crypto.randomUUID();
    const result = await confirmBooking(
      agent,
      confirmInput(hold.holdToken, key, 10),
    );
    expect(Number(result.totalAmount)).toBe(90);
    expect(result.pnr).toMatch(/^A1[A-F0-9]{10}$/);
    const retry = await confirmBooking(
      agent,
      confirmInput(hold.holdToken, key, 10),
    );
    expect(retry.id).toBe(result.id);
    expect(state.bookings).toHaveLength(1);
    expect((await getBookingByPnr(agent, result.pnr)).pnr).toBe(result.pnr);
  });
  test("booking history is paginated", async () => {
    state.bookings = [
      { id: "booking-1", agencyId: agent.agencyId, branchId: agent.branchId },
    ];
    const result = await listBookings(agent, { page: 1, limit: 10 });
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });
});
