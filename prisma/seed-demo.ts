import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env", "apps/api/.env"] });

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL or DIRECT_URL is required to seed");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// All identifiers are scoped to the development agencies. Re-running on the same day
// fills missing fixtures without replacing bookings or operational edits.
const routes = [
  {
    code: "AMD-SRT",
    name: "Ahmedabad to Surat Express",
    source: "Ahmedabad",
    destination: "Surat",
    description: "Evening service via Nadiad, Anand and Bharuch.",
    stops: [
      {
        name: "Ahmedabad Central",
        city: "Ahmedabad",
        address: "Geeta Mandir Bus Stand",
        minutes: 0,
      },
      {
        name: "Nadiad",
        city: "Nadiad",
        address: "Nadiad Bus Station",
        minutes: 55,
      },
      {
        name: "Anand",
        city: "Anand",
        address: "Anand Bus Station",
        minutes: 85,
      },
      {
        name: "Bharuch",
        city: "Bharuch",
        address: "Bharuch Bus Station",
        minutes: 180,
      },
      {
        name: "Surat Central",
        city: "Surat",
        address: "Surat Central Bus Station",
        minutes: 245,
      },
    ],
  },
  {
    code: "AMD-RJK",
    name: "Ahmedabad to Rajkot",
    source: "Ahmedabad",
    destination: "Rajkot",
    description: "Daily intercity service via Limbdi and Chotila.",
    stops: [
      {
        name: "Ahmedabad Central",
        city: "Ahmedabad",
        address: "Geeta Mandir Bus Stand",
        minutes: 0,
      },
      {
        name: "Limbdi",
        city: "Limbdi",
        address: "Limbdi Bus Stand",
        minutes: 95,
      },
      {
        name: "Chotila",
        city: "Chotila",
        address: "Chotila Bus Stand",
        minutes: 160,
      },
      {
        name: "Rajkot Central",
        city: "Rajkot",
        address: "Rajkot Bus Port",
        minutes: 255,
      },
    ],
  },
  {
    code: "SRT-VAD",
    name: "Surat to Vadodara",
    source: "Surat",
    destination: "Vadodara",
    description: "Morning service with a stop in Bharuch.",
    stops: [
      {
        name: "Surat Central",
        city: "Surat",
        address: "Surat Central Bus Station",
        minutes: 0,
      },
      {
        name: "Bharuch",
        city: "Bharuch",
        address: "Bharuch Bus Station",
        minutes: 75,
      },
      {
        name: "Vadodara Central",
        city: "Vadodara",
        address: "Vadodara Central Bus Station",
        minutes: 150,
      },
    ],
  },
] as const;

function dateAt(day: Date, hour: number, minute = 0) {
  const date = new Date(day);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function dayOffset(offset: number) {
  // Trips are stored with a UTC travel date; local departure is expressed as UTC.
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + offset);
  return day;
}

async function seedRoute(
  agencyId: string,
  definition: (typeof routes)[number],
) {
  const route = await prisma.route.upsert({
    where: { agencyId_code: { agencyId, code: definition.code } },
    update: {},
    create: {
      agencyId,
      code: definition.code,
      name: definition.name,
      source: definition.source,
      destination: definition.destination,
      description: definition.description,
    },
  });
  const stops = [];
  for (const [index, item] of definition.stops.entries()) {
    const stop = await prisma.stop.upsert({
      where: { routeId_sequence: { routeId: route.id, sequence: index + 1 } },
      update: {},
      create: {
        routeId: route.id,
        sequence: index + 1,
        name: item.name,
        city: item.city,
        address: item.address,
        estimatedMinutesFromOrigin: item.minutes,
      },
    });
    await prisma.boardingPoint.upsert({
      where: { stopId_pointType: { stopId: stop.id, pointType: "BOTH" } },
      update: {},
      create: { stopId: stop.id, pointType: "BOTH", timeOffset: item.minutes },
    });
    stops.push(stop);
  }
  return { route, stops };
}

async function seedBus(
  agencyId: string,
  branchId: string,
  number: string,
  registration: string,
  type: "SEATER" | "SLEEPER",
) {
  const bus = await prisma.bus.upsert({
    where: { agencyId_busNumber: { agencyId, busNumber: number } },
    update: {},
    create: {
      agencyId,
      branchId,
      busNumber: number,
      registrationNumber: registration,
      operatorName: "Digol Tours",
      busType: type,
      totalSeats: 32,
      make: "Tata",
      model: type === "SLEEPER" ? "Starbus Sleeper" : "Starbus Ultra",
      year: 2024,
      color: "White",
      amenities: ["Air conditioning", "Charging point", "Water bottle"],
      description:
        type === "SLEEPER"
          ? "Air conditioned overnight coach"
          : "Air conditioned intercity coach",
    },
  });
  await prisma.busSeatLayout.upsert({
    where: { busId: bus.id },
    update: {},
    create: {
      busId: bus.id,
      rows: 8,
      columns: 4,
      disabledSeats: [],
      seatDetails: {},
    },
  });
  return bus;
}

async function seedDriver(
  agencyId: string,
  branchId: string,
  firstName: string,
  lastName: string,
  phone: string,
  licenseNumber: string,
) {
  return prisma.driver.upsert({
    where: { agencyId_licenseNumber: { agencyId, licenseNumber } },
    update: {},
    create: {
      agencyId,
      branchId,
      firstName,
      lastName,
      phone,
      licenseNumber,
      licenseExpiryDate: new Date("2030-12-31T00:00:00.000Z"),
    },
  });
}

type SeedTrip = {
  agencyId: string;
  branchId: string;
  routeId: string;
  busId: string;
  driverId: string;
  code: string;
  fare: number;
  departureHour: number;
  arrivalHour: number;
  arrivalNextDay?: boolean;
};
async function seedTrip(input: SeedTrip, day: Date) {
  const stamp = day.toISOString().slice(0, 10).replaceAll("-", "");
  const tripCode = `DEMO-${input.code}-${stamp}`;
  const arrivalDay = new Date(day);
  if (input.arrivalNextDay) arrivalDay.setUTCDate(arrivalDay.getUTCDate() + 1);
  return prisma.trip.upsert({
    where: { agencyId_tripCode: { agencyId: input.agencyId, tripCode } },
    update: {},
    create: {
      agencyId: input.agencyId,
      branchId: input.branchId,
      routeId: input.routeId,
      busId: input.busId,
      driverId: input.driverId,
      tripCode,
      travelDate: day,
      departureTime: dateAt(day, input.departureHour),
      arrivalTime: dateAt(arrivalDay, input.arrivalHour),
      fare: input.fare,
    },
  });
}

async function seedBooking(input: {
  trip: Awaited<ReturnType<typeof seedTrip>>;
  agencyId: string;
  branchId: string;
  userId: string;
  boardingStopId: string;
  dropOffStopId: string;
  passengers: {
    seatName: string;
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
    phone: string;
  }[];
  paid: number;
  suffix: string;
}) {
  const pnr = `D${input.trip.tripCode.replaceAll("-", "").slice(-18)}${input.suffix}`;
  if (await prisma.booking.findUnique({ where: { pnr } })) return;
  const fare = Number(input.trip.fare) * input.passengers.length;
  const tax = Math.round(fare * 0.05 * 100) / 100;
  const commission = Math.round(fare * 0.05 * 100) / 100;
  const total = fare + tax;
  const seatNames = input.passengers.map((passenger) => passenger.seatName);
  await prisma.$transaction(async (tx) => {
    const occupied = await tx.tripSeat.count({
      where: {
        tripId: input.trip.id,
        seatName: { in: seatNames },
        status: { not: "AVAILABLE" },
      },
    });
    if (occupied)
      throw new Error(`Demo seats already occupied for ${input.trip.tripCode}`);
    const booking = await tx.booking.create({
      data: {
        pnr,
        idempotencyKey: `demo-${pnr}`,
        holdToken: `demo-hold-${pnr}`,
        agencyId: input.agencyId,
        branchId: input.branchId,
        tripId: input.trip.id,
        bookedById: input.userId,
        boardingStopId: input.boardingStopId,
        dropOffStopId: input.dropOffStopId,
        baseFare: fare,
        totalAmount: total,
        taxRate: 5,
        taxAmount: tax,
        commissionType: "PERCENTAGE",
        commissionRate: 5,
        commissionAmount: commission,
        passengers: { create: input.passengers },
      },
    });
    for (const seatName of seatNames) {
      await tx.tripSeat.upsert({
        where: { tripId_seatName: { tripId: input.trip.id, seatName } },
        update: {
          status: "BOOKED",
          bookingId: booking.id,
          holdToken: null,
          heldById: null,
          holdExpiresAt: null,
        },
        create: {
          tripId: input.trip.id,
          seatName,
          status: "BOOKED",
          bookingId: booking.id,
        },
      });
    }
    await tx.agentCommission.create({
      data: {
        bookingId: booking.id,
        agencyId: input.agencyId,
        agentId: input.userId,
        amount: commission,
      },
    });
    const ledger: Prisma.FinanceLedgerCreateManyInput[] = [
      {
        agencyId: input.agencyId,
        bookingId: booking.id,
        type: "COMMISSION",
        party: "AGENT",
        partyId: input.userId,
        amount: commission,
        description: `Commission earned for booking ${pnr}`,
      },
      {
        agencyId: input.agencyId,
        bookingId: booking.id,
        type: "OPERATOR_PAYABLE",
        party: "OPERATOR",
        partyId: input.agencyId,
        amount: total - tax - commission,
        description: `Operator payable accrued for booking ${pnr}`,
      },
    ];
    if (input.paid > 0) {
      await tx.paymentRecord.create({
        data: {
          bookingId: booking.id,
          agencyId: input.agencyId,
          amount: input.paid,
          method: "UPI",
          reference: `DEMO-${pnr}`,
          recordedById: input.userId,
        },
      });
      ledger.push({
        agencyId: input.agencyId,
        bookingId: booking.id,
        type: "PAYMENT",
        amount: input.paid,
        description: `Payment received for booking ${pnr}`,
      });
    }
    await tx.financeLedger.createMany({ data: ledger });
  });
}

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("The demo seed cannot run in production");
  const agencyA = await prisma.agency.findUnique({
    where: { slug: "agency-a" },
  });
  const agencyB = await prisma.agency.findUnique({
    where: { slug: "agency-b" },
  });
  if (!agencyA || !agencyB)
    throw new Error(
      "Run `bun run prisma:seed` first to create the development agencies and login users",
    );
  const [branchA1, branchA2, branchB1, agent] = await Promise.all([
    prisma.branch.findUnique({
      where: { agencyId_code: { agencyId: agencyA.id, code: "A1" } },
    }),
    prisma.branch.findUnique({
      where: { agencyId_code: { agencyId: agencyA.id, code: "A2" } },
    }),
    prisma.branch.findUnique({
      where: { agencyId_code: { agencyId: agencyB.id, code: "B1" } },
    }),
    prisma.user.findUnique({ where: { email: "agent.a1@aone.local" } }),
  ]);
  if (!branchA1 || !branchA2 || !branchB1 || !agent)
    throw new Error(
      "Development branches or agent are missing. Run `bun run prisma:seed` first",
    );

  for (const agency of [agencyA, agencyB]) {
    await prisma.financeSettings.upsert({
      where: { agencyId: agency.id },
      update: {},
      create: {
        agencyId: agency.id,
        gstRate: 5,
        gstAfterDiscount: true,
        commissionType: "PERCENTAGE",
        commissionValue: 5,
      },
    });
    for (const [hours, fee] of [
      [48, 10],
      [12, 25],
      [0, 50],
    ]) {
      await prisma.cancellationTier.upsert({
        where: {
          agencyId_hoursBeforeDeparture: {
            agencyId: agency.id,
            hoursBeforeDeparture: hours,
          },
        },
        update: {},
        create: {
          agencyId: agency.id,
          hoursBeforeDeparture: hours,
          feePercent: fee,
        },
      });
    }
  }
  const [surat, rajkot, vadodara] = await Promise.all([
    seedRoute(agencyA.id, routes[0]),
    seedRoute(agencyA.id, routes[1]),
    seedRoute(agencyB.id, routes[2]),
  ]);
  const [busA1, busA2, busB1, driverA1, driverA2, driverB1] = await Promise.all(
    [
      seedBus(agencyA.id, branchA1.id, "DL-101", "GJ-01-DE-0101", "SEATER"),
      seedBus(agencyA.id, branchA2.id, "DL-202", "GJ-01-DE-0202", "SLEEPER"),
      seedBus(agencyB.id, branchB1.id, "DL-301", "GJ-05-DE-0301", "SEATER"),
      seedDriver(
        agencyA.id,
        branchA1.id,
        "Rakesh",
        "Patel",
        "+919800001101",
        "GJ-DEMO-101",
      ),
      seedDriver(
        agencyA.id,
        branchA2.id,
        "Mehul",
        "Shah",
        "+919800001202",
        "GJ-DEMO-202",
      ),
      seedDriver(
        agencyB.id,
        branchB1.id,
        "Imran",
        "Shaikh",
        "+919800001303",
        "GJ-DEMO-303",
      ),
    ],
  );
  const services: SeedTrip[] = [
    {
      agencyId: agencyA.id,
      branchId: branchA1.id,
      routeId: surat.route.id,
      busId: busA1.id,
      driverId: driverA1.id,
      code: "AMD-SRT",
      fare: 650,
      departureHour: 12,
      arrivalHour: 16,
    },
    {
      agencyId: agencyA.id,
      branchId: branchA2.id,
      routeId: rajkot.route.id,
      busId: busA2.id,
      driverId: driverA2.id,
      code: "AMD-RJK",
      fare: 850,
      departureHour: 16,
      arrivalHour: 21,
    },
    {
      agencyId: agencyB.id,
      branchId: branchB1.id,
      routeId: vadodara.route.id,
      busId: busB1.id,
      driverId: driverB1.id,
      code: "SRT-VAD",
      fare: 450,
      departureHour: 3,
      arrivalHour: 6,
    },
  ];
  const tripIds: string[] = [];
  for (let offset = 1; offset <= 7; offset++) {
    const day = dayOffset(offset);
    for (const service of services) {
      const trip = await seedTrip(service, day);
      tripIds.push(trip.id);
      if (offset === 1 && service.code === "AMD-SRT") {
        await seedBooking({
          trip,
          agencyId: agencyA.id,
          branchId: branchA1.id,
          userId: agent.id,
          boardingStopId: surat.stops[0].id,
          dropOffStopId: surat.stops.at(-1)!.id,
          passengers: [
            {
              seatName: "A1",
              firstName: "Priya",
              lastName: "Mehta",
              age: 29,
              gender: "Female",
              phone: "+919800002001",
            },
            {
              seatName: "A2",
              firstName: "Arjun",
              lastName: "Mehta",
              age: 31,
              gender: "Male",
              phone: "+919800002002",
            },
          ],
          paid: 1365,
          suffix: "01",
        });
      }
      if (offset === 2 && service.code === "AMD-SRT") {
        await seedBooking({
          trip,
          agencyId: agencyA.id,
          branchId: branchA1.id,
          userId: agent.id,
          boardingStopId: surat.stops[1].id,
          dropOffStopId: surat.stops.at(-1)!.id,
          passengers: [
            {
              seatName: "B1",
              firstName: "Neha",
              lastName: "Desai",
              age: 36,
              gender: "Female",
              phone: "+919800002003",
            },
          ],
          paid: 300,
          suffix: "02",
        });
      }
    }
  }
  const bookings = await prisma.booking.findMany({
    where: { tripId: { in: tripIds }, idempotencyKey: { startsWith: "demo-" } },
    include: {
      passengers: true,
      payments: true,
      seats: true,
      ledgerEntries: true,
    },
  });
  if (
    bookings.length < 2 ||
    bookings.some(
      (booking) =>
        booking.passengers.length === 0 ||
        booking.seats.length !== booking.passengers.length ||
        booking.payments.length === 0 ||
        booking.ledgerEntries.length < 3,
    )
  )
    throw new Error("Demo booking verification failed");
  console.info(
    `Demo seed ready: 3 routes, 3 buses, 3 drivers, ${tripIds.length} upcoming trips and ${bookings.length} sample bookings. Re-running preserves existing records.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
