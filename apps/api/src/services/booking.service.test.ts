import { beforeEach, describe, expect, mock, test } from "bun:test";

const state: {
  seats: Array<Record<string, unknown>>;
  bookings: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  ledger: Array<Record<string, unknown>>;
  serial: Promise<void>;
} = {
  seats: [],
  bookings: [],
  payments: [],
  ledger: [],
  serial: Promise.resolve(),
};
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
      const filter = value as {
        in?: unknown[];
        lte?: Date;
        gt?: Date;
        gte?: Date;
        lt?: Date;
      };
      if (filter.gte && filter.lt)
        return (
          new Date(String(row[key])) >= filter.gte &&
          new Date(String(row[key])) < filter.lt
        );
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
  agentCommission: { create: async () => ({}) },
  financeLedger: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.ledger.push(data);
      return data;
    },
  },
  paymentRecord: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.payments.push(data);
      return data;
    },
  },
  auditLog: { create: async () => ({}) },
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
  financeSettings: { findUnique: async () => null },
  trip: {
    findUnique: async () => trip,
    findMany: mock(async (query: unknown) => {
      void query;
      return [
        trip,
        { ...trip, id: "trip-2", bus: { ...trip.bus, totalSeats: 5 } },
      ];
    }),
    count: mock(async (query: unknown) => {
      void query;
      return 1;
    }),
  },
  bus: {
    count: mock(async (query: unknown) => {
      void query;
      return 2;
    }),
  },
  tripSeat: {
    groupBy: mock(async ({ where }: { where: Record<string, unknown> }) => {
      const counts = new Map<string, number>();
      for (const seat of state.seats.filter((row) => matches(row, where))) {
        const id = String(seat.tripId);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return [...counts].map(([tripId, count]) => ({
        tripId,
        _count: { _all: count },
      }));
    }),
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
    count: async ({ where }: { where?: Record<string, unknown> } = {}) =>
      where
        ? state.bookings.filter((row) => matches(row, where)).length
        : state.bookings.length,
    aggregate: async ({ where }: { where: Record<string, unknown> }) => ({
      _sum: {
        totalAmount: state.bookings
          .filter((row) => matches(row, where))
          .reduce((sum, row) => sum + Number(row.totalAmount), 0),
      },
    }),
    findMany: mock(async (query: unknown) => {
      void query;
      return state.bookings;
    }),
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
  getBookingDashboardSummary,
  getBookingByPnr,
  holdSeats,
  listBookings,
  searchTrips,
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
  state.payments = [];
  state.ledger = [];
  state.serial = Promise.resolve();
});
describe("booking service", () => {
  test("trip search batches seat counts, ignores expired holds, and keeps tenant scope", async () => {
    prisma.tripSeat.groupBy.mockClear();
    prisma.trip.findMany.mockClear();
    state.seats = [
      { tripId: "trip-1", status: "BOOKED" },
      {
        tripId: "trip-1",
        status: "HELD",
        holdExpiresAt: new Date(Date.now() + 60000),
      },
      { tripId: "trip-2", status: "BOOKED" },
      {
        tripId: "trip-2",
        status: "HELD",
        holdExpiresAt: new Date(Date.now() - 60000),
      },
    ];
    const result = await searchTrips(agent, {
      source: "Origin",
      destination: "Destination",
      date: "2099-06-01",
    });
    expect(result.map((row) => row.availableSeats)).toEqual([0, 4]);
    expect(prisma.tripSeat.groupBy.mock.calls).toHaveLength(2);
    const query = prisma.trip.findMany.mock.calls[0][0] as {
      where: { agencyId: string; branchId: string };
    };
    expect(query.where.agencyId).toBe(agent.agencyId);
    expect(query.where.branchId).toBe(agent.branchId);
  });
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
  test("initial payments are recorded once with booking and ledger", async () => {
    const hold = await holdSeats(agent, { tripId: trip.id, seats: ["A1"] });
    const input = {
      ...confirmInput(hold.holdToken, crypto.randomUUID()),
      initialPayment: { mode: "FULL" as const, method: "CASH" as const },
    };
    const cashier = {
      ...agent,
      permissions: [...agent.permissions, "finance:payment"],
    };
    const result = await confirmBooking(cashier, input);
    await confirmBooking(cashier, input);
    expect(state.payments).toHaveLength(1);
    expect(state.payments[0]).toMatchObject({
      bookingId: result.id,
      amount: 100,
      recordedById: agent.userId,
    });
    expect(state.ledger.filter((row) => row.type === "PAYMENT")).toHaveLength(
      1,
    );
  });
  test("invalid, excessive and unauthorized initial payments do not create bookings", async () => {
    const hold = await holdSeats(agent, { tripId: trip.id, seats: ["A1"] });
    const input = {
      ...confirmInput(hold.holdToken, crypto.randomUUID()),
      initialPayment: {
        mode: "PARTIAL" as const,
        amount: 101,
        method: "UPI" as const,
      },
    };
    await expect(confirmBooking(agent, input)).rejects.toMatchObject({
      statusCode: 403,
    });
    const cashier = {
      ...agent,
      permissions: [...agent.permissions, "finance:payment"],
    };
    await expect(confirmBooking(cashier, input)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      confirmBooking(cashier, {
        ...input,
        initialPayment: { ...input.initialPayment, amount: 0 },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(state.bookings).toHaveLength(0);
    expect(state.payments).toHaveLength(0);
  });
  test("required passenger details reject whitespace, invalid age, gender and phone", async () => {
    const hold = await holdSeats(agent, { tripId: trip.id, seats: ["A1"] });
    const input = confirmInput(hold.holdToken, crypto.randomUUID());
    for (const invalid of [
      { firstName: " " },
      { lastName: " " },
      { age: NaN },
      { age: 121 },
      { gender: "invalid" },
      { phone: "123" },
    ]) {
      await expect(
        confirmBooking(agent, {
          ...input,
          passengers: [{ ...input.passengers[0]!, ...invalid }],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(state.bookings).toHaveLength(0);
  });
  test("ticket search applies PNR, email and phone matching inside branch scope", async () => {
    await listBookings(agent, { page: 1, limit: 20, search: "9800002002" });
    const call = prisma.booking.findMany.mock.calls.at(-1)?.[0] as {
      where: Record<string, unknown>;
    };
    expect(call.where).toMatchObject({
      agencyId: "agency-1",
      branchId: "branch-1",
    });
    expect(call.where.OR).toEqual([
      { pnr: { contains: "9800002002", mode: "insensitive" } },
      {
        passengers: {
          some: { email: { contains: "9800002002", mode: "insensitive" } },
        },
      },
      {
        passengers: {
          some: { phone: { contains: "9800002002", mode: "insensitive" } },
        },
      },
    ]);
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

describe("dashboard totals", () => {
  test("exclude cancelled bookings and count colleagues only within the employee's branch", async () => {
    const common = {
      createdAt: new Date(),
      status: "CONFIRMED",
      agencyId: "agency-1",
      agentId: "colleague",
    };
    state.bookings = [
      { ...common, branchId: "branch-1", totalAmount: 200 },
      {
        ...common,
        branchId: "branch-1",
        status: "CANCELLED",
        totalAmount: 900,
      },
      { ...common, branchId: "branch-2", totalAmount: 300 },
      {
        ...common,
        agencyId: "agency-2",
        branchId: "branch-3",
        totalAmount: 500,
      },
    ];
    const employee = await getBookingDashboardSummary(agent as never);
    expect(employee.todayBookings).toBe(1);
    expect(employee.todaySales).toBe(200);
    expect(prisma.bus.count.mock.lastCall?.[0]).toMatchObject({
      where: { agencyId: "agency-1", branchId: "branch-1", status: "ACTIVE" },
    });
    expect(prisma.trip.count.mock.lastCall?.[0]).toMatchObject({
      where: {
        agencyId: "agency-1",
        branchId: "branch-1",
        status: "SCHEDULED",
      },
    });
    const owner = await getBookingDashboardSummary({
      ...agent,
      role: "AGENCY_ADMIN",
      roleScope: "AGENCY",
    } as never);
    expect(owner.todayBookings).toBe(2);
    expect(owner.todaySales).toBe(500);
    expect(prisma.bus.count.mock.lastCall?.[0]).toMatchObject({
      where: { agencyId: "agency-1", status: "ACTIVE" },
    });
    expect(
      (prisma.bus.count.mock.lastCall?.[0] as { where: { branchId?: string } })
        .where.branchId,
    ).toBeUndefined();
    state.bookings = [];
  });
});
