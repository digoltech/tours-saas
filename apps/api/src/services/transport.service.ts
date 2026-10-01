import { BusType, Prisma, RecordStatus, TripStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { isBranchScoped } from "../middleware/tenant-policy.js";
import { audit } from "./stage4.service.js";

export type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  branchId?: string;
  busType?: string;
  routeId?: string;
  busId?: string;
  driverId?: string;
  travelDate?: string;
  departureAfter?: string;
};

type ServiceError = Error & { statusCode?: number; code?: string };
function fail(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}
function pageResult<T>(data: T[], page: number, limit: number, total: number) {
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
function paging(query: ListQuery) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  return { page, limit };
}
function scopedAgency(context: AuthContext, requested?: string) {
  if (context.role === "SUPER_ADMIN") {
    if (!requested)
      fail(
        400,
        "INVALID_REQUEST",
        "agencyId is required for Super Admin writes",
      );
    return requested;
  }
  if (!context.agencyId)
    fail(403, "FORBIDDEN", "Your account is not assigned to an agency");
  if (requested && requested !== context.agencyId)
    fail(403, "FORBIDDEN", "You cannot manage another agency");
  return context.agencyId;
}
function canAgency(context: AuthContext, agencyId: string, branchId?: string) {
  if (context.role === "SUPER_ADMIN") return true;
  if (context.agencyId !== agencyId) return false;
  return (
    !isBranchScoped(context) ||
    context.branchId === branchId
  );
}
async function branchInAgency(
  context: AuthContext,
  agencyId: string,
  branchId: string,
) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (
    !branch ||
    branch.agencyId !== agencyId ||
    !canAgency(context, agencyId, branchId)
  )
    fail(403, "FORBIDDEN", "You do not have access to this branch");
  return branch;
}
function status(value?: string) {
  return value === "ACTIVE" || value === "INACTIVE"
    ? (value as RecordStatus)
    : undefined;
}
function tripStatus(value?: string) {
  return value && Object.values(TripStatus).includes(value as TripStatus)
    ? (value as TripStatus)
    : undefined;
}
function handleUnique(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    fail(409, "CONFLICT", "A record with the same identifier already exists");
  throw error;
}

export async function listBuses(context: AuthContext, query: ListQuery) {
  const { page, limit } = paging(query);
  const where: Prisma.BusWhereInput = {
    ...(context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(isBranchScoped(context)
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        }),
    ...(status(query.status) ? { status: status(query.status) } : {}),
    ...(query.busType &&
    Object.values(BusType).includes(query.busType as BusType)
      ? { busType: query.busType as BusType }
      : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.search
      ? {
          OR: [
            {
              registrationNumber: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            { busNumber: { contains: query.search, mode: "insensitive" } },
            { operatorName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.bus.count({ where }),
    prisma.bus.findMany({
      where,
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return pageResult(data, page, limit, total);
}
export async function getBus(context: AuthContext, id: string) {
  const data = await prisma.bus.findUnique({
    where: { id },
    include: { branch: true },
  });
  if (!data) fail(404, "NOT_FOUND", "Bus not found");
  if (!canAgency(context, data.agencyId, data.branchId))
    fail(403, "FORBIDDEN", "You do not have access to this bus");
  return data;
}
export async function createBus(
  context: AuthContext,
  input: {
    agencyId?: string;
    branchId: string;
    registrationNumber: string;
    busNumber: string;
    operatorName?: string;
    busType: "SEATER" | "SLEEPER" | "SEATER_SLEEPER";
    totalSeats: number;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    description?: string | null;
    amenities?: string[];
    photos?: string[];
  },
) {
  const agencyId = scopedAgency(context, input.agencyId);
  await branchInAgency(context, agencyId, input.branchId);
  try {
    const created = await prisma.bus.create({
      data: {
        ...input,
        agencyId,
        registrationNumber: input.registrationNumber.trim().toUpperCase(),
        busNumber: input.busNumber.trim(),
        operatorName: input.operatorName?.trim() || null,
      },
    });
    await audit(context, agencyId, "BUS_CREATED", "Bus", created.id, { branchId: created.branchId, busNumber: created.busNumber });
    return created;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function updateBus(
  context: AuthContext,
  id: string,
  input: Partial<{
    branchId: string;
    registrationNumber: string;
    busNumber: string;
    operatorName: string | null;
    busType: "SEATER" | "SLEEPER" | "SEATER_SLEEPER";
    totalSeats: number;
    status: RecordStatus;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    description: string | null;
    amenities: string[];
    photos: string[];
  }>,
) {
  const current = await getBus(context, id);
  if (input.branchId)
    await branchInAgency(context, current.agencyId, input.branchId);
  try {
    const updated = await prisma.bus.update({
      where: { id },
      data: {
        ...input,
        registrationNumber: input.registrationNumber?.trim().toUpperCase(),
        busNumber: input.busNumber?.trim(),
        operatorName: input.operatorName?.trim() || null,
      },
    });
    await audit(context, current.agencyId, "BUS_UPDATED", "Bus", updated.id, { branchId: updated.branchId, busNumber: updated.busNumber });
    return updated;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateBus(context: AuthContext, id: string) {
  const current = await getBus(context, id);
  const updated = await prisma.bus.update({ where: { id }, data: { status: "INACTIVE" } });
  await audit(context, current.agencyId, "BUS_DEACTIVATED", "Bus", id, { branchId: current.branchId, busNumber: current.busNumber });
  return updated;
}

export async function listDrivers(context: AuthContext, query: ListQuery) {
  const { page, limit } = paging(query);
  const where: Prisma.DriverWhereInput = {
    ...(context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(isBranchScoped(context)
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        }),
    ...(status(query.status) ? { status: status(query.status) } : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
            { licenseNumber: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return pageResult(data, page, limit, total);
}
export async function getDriver(context: AuthContext, id: string) {
  const data = await prisma.driver.findUnique({
    where: { id },
    include: { branch: true },
  });
  if (!data) fail(404, "NOT_FOUND", "Driver not found");
  if (!canAgency(context, data.agencyId, data.branchId))
    fail(403, "FORBIDDEN", "You do not have access to this driver");
  return data;
}
export async function createDriver(
  context: AuthContext,
  input: {
    agencyId?: string;
    branchId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    licenseNumber: string;
    licenseExpiryDate?: string;
  },
) {
  const agencyId = scopedAgency(context, input.agencyId);
  await branchInAgency(context, agencyId, input.branchId);
  try {
    const created = await prisma.driver.create({
      data: {
        ...input,
        agencyId,
        email: input.email?.trim() || null,
        licenseExpiryDate: input.licenseExpiryDate
          ? new Date(input.licenseExpiryDate)
          : null,
      },
    });
    await audit(context, agencyId, "DRIVER_CREATED", "Driver", created.id, { branchId: created.branchId, licenseNumber: created.licenseNumber });
    return created;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function updateDriver(
  context: AuthContext,
  id: string,
  input: Partial<{
    branchId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    licenseNumber: string;
    licenseExpiryDate: string | null;
    status: RecordStatus;
  }>,
) {
  const current = await getDriver(context, id);
  if (input.branchId)
    await branchInAgency(context, current.agencyId, input.branchId);
  try {
    const updated = await prisma.driver.update({
      where: { id },
      data: {
        ...input,
        licenseExpiryDate:
          input.licenseExpiryDate === null
            ? null
            : input.licenseExpiryDate
              ? new Date(input.licenseExpiryDate)
              : undefined,
      },
    });
    await audit(context, current.agencyId, "DRIVER_UPDATED", "Driver", updated.id, { branchId: updated.branchId, licenseNumber: updated.licenseNumber });
    return updated;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateDriver(context: AuthContext, id: string) {
  const current = await getDriver(context, id);
  const updated = await prisma.driver.update({ where: { id }, data: { status: "INACTIVE" } });
  await audit(context, current.agencyId, "DRIVER_DEACTIVATED", "Driver", id, { branchId: current.branchId, licenseNumber: current.licenseNumber });
  return updated;
}

export async function listRoutes(context: AuthContext, query: ListQuery) {
  const { page, limit } = paging(query);
  const where: Prisma.RouteWhereInput = {
    ...(context.role === "SUPER_ADMIN"
      ? {}
      : { agencyId: context.agencyId ?? "__missing__" }),
    ...(status(query.status) ? { status: status(query.status) } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { code: { contains: query.search, mode: "insensitive" } },
            { source: { contains: query.search, mode: "insensitive" } },
            { destination: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.route.count({ where }),
    prisma.route.findMany({
      where,
      include: { _count: { select: { stops: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return pageResult(data, page, limit, total);
}
export async function getRoute(context: AuthContext, id: string) {
  const data = await prisma.route.findUnique({
    where: { id },
    include: {
      stops: { include: { points: true }, orderBy: { sequence: "asc" } },
    },
  });
  if (!data) fail(404, "NOT_FOUND", "Route not found");
  if (!canAgency(context, data.agencyId))
    fail(403, "FORBIDDEN", "You do not have access to this route");
  return data;
}
export async function createRoute(
  context: AuthContext,
  input: {
    agencyId?: string;
    name: string;
    code: string;
    source: string;
    destination: string;
    description?: string;
  },
) {
  const agencyId = scopedAgency(context, input.agencyId);
  try {
    const created = await prisma.route.create({
      data: {
        ...input,
        agencyId,
        code: input.code.trim().toUpperCase(),
        description: input.description?.trim() || null,
      },
    });
    await audit(context, agencyId, "ROUTE_CREATED", "Route", created.id, { code: created.code });
    return created;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function updateRoute(
  context: AuthContext,
  id: string,
  input: Partial<{
    name: string;
    code: string;
    source: string;
    destination: string;
    description: string | null;
    status: RecordStatus;
  }>,
) {
  const current = await getRoute(context, id);
  try {
    const updated = await prisma.route.update({
      where: { id },
      data: { ...input, code: input.code?.trim().toUpperCase() },
    });
    await audit(context, current.agencyId, "ROUTE_UPDATED", "Route", updated.id, { code: updated.code });
    return updated;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateRoute(context: AuthContext, id: string) {
  const current = await getRoute(context, id);
  const updated = await prisma.route.update({ where: { id }, data: { status: "INACTIVE" } });
  await audit(context, current.agencyId, "ROUTE_DEACTIVATED", "Route", id, { code: current.code });
  return updated;
}

async function ownedStop(context: AuthContext, id: string) {
  const stop = await prisma.stop.findUnique({
    where: { id },
    include: { route: true },
  });
  if (!stop) fail(404, "NOT_FOUND", "Stop not found");
  if (!canAgency(context, stop.route.agencyId))
    fail(403, "FORBIDDEN", "You do not have access to this stop");
  return stop;
}
export async function listStops(context: AuthContext, routeId: string) {
  await getRoute(context, routeId);
  return prisma.stop.findMany({
    where: { routeId },
    include: { points: true },
    orderBy: { sequence: "asc" },
  });
}
export async function createStop(
  context: AuthContext,
  routeId: string,
  input: {
    name: string;
    address?: string;
    city?: string;
    sequence: number;
    estimatedMinutesFromOrigin?: number;
  },
) {
  const route = await getRoute(context, routeId);
  try {
    const created = await prisma.stop.create({
      data: {
        ...input,
        routeId,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
      },
    });
    await audit(context, route.agencyId, "STOP_CREATED", "Stop", created.id, { routeId: route.id, sequence: created.sequence });
    return created;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function updateStop(
  context: AuthContext,
  id: string,
  input: Partial<{
    name: string;
    address: string | null;
    city: string | null;
    sequence: number;
    estimatedMinutesFromOrigin: number | null;
    status: RecordStatus;
  }>,
) {
  const current = await ownedStop(context, id);
  try {
    const updated = await prisma.stop.update({ where: { id }, data: input });
    await audit(context, current.route.agencyId, "STOP_UPDATED", "Stop", id, { routeId: current.routeId, sequence: updated.sequence });
    return updated;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateStop(context: AuthContext, id: string) {
  const current = await ownedStop(context, id);
  const updated = await prisma.stop.update({ where: { id }, data: { status: "INACTIVE" } });
  await audit(context, current.route.agencyId, "STOP_DEACTIVATED", "Stop", id, { routeId: current.routeId, sequence: current.sequence });
  return updated;
}
export async function getStop(context: AuthContext, id: string) {
  return ownedStop(context, id);
}
export async function upsertPoint(
  context: AuthContext,
  stopId: string,
  input: {
    pointType: "BOARDING" | "DROP_OFF" | "BOTH";
    timeOffset?: number;
    status?: RecordStatus;
  },
) {
  const stop = await ownedStop(context, stopId);
  try {
    const point = await prisma.boardingPoint.upsert({
      where: { stopId_pointType: { stopId, pointType: input.pointType } },
      create: { stopId, ...input },
      update: input,
    });
    await audit(context, stop.route.agencyId, "BOARDING_POINT_UPDATED", "BoardingPoint", point.id, { routeId: stop.routeId, stopId });
    return point;
  } catch (error) {
    return handleUnique(error);
  }
}

async function ownedTrip(context: AuthContext, id: string) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      route: {
        include: {
          stops: { orderBy: { sequence: "asc" }, include: { points: true } },
        },
      },
      bus: true,
      driver: true,
      branch: true,
    },
  });
  if (!trip) fail(404, "NOT_FOUND", "Trip not found");
  if (!canAgency(context, trip.agencyId, trip.branchId))
    fail(403, "FORBIDDEN", "You do not have access to this trip");
  return trip;
}
async function validateTripResources(
  context: AuthContext,
  input: {
    agencyId?: string;
    branchId: string;
    routeId: string;
    busId: string;
    driverId: string;
    departureTime: string;
    arrivalTime: string;
    fare?: number;
  },
  excludeId?: string,
) {
  const agencyId = scopedAgency(context, input.agencyId);
  const [branch, route, bus, driver] = await Promise.all([
    prisma.branch.findUnique({ where: { id: input.branchId } }),
    prisma.route.findUnique({ where: { id: input.routeId } }),
    prisma.bus.findUnique({ where: { id: input.busId } }),
    prisma.driver.findUnique({ where: { id: input.driverId } }),
  ]);
  if (
    !branch ||
    branch.agencyId !== agencyId ||
    !canAgency(context, agencyId, input.branchId)
  )
    fail(403, "FORBIDDEN", "Branch is outside your tenant");
  if (!route || route.agencyId !== agencyId)
    fail(403, "FORBIDDEN", "Route is outside your tenant");
  if (
    !bus ||
    bus.agencyId !== agencyId ||
    bus.branchId !== input.branchId ||
    bus.status !== "ACTIVE"
  )
    fail(
      400,
      "INVALID_REQUEST",
      "Bus must be active and assigned to the selected branch",
    );
  if (
    !driver ||
    driver.agencyId !== agencyId ||
    driver.branchId !== input.branchId ||
    driver.status !== "ACTIVE"
  )
    fail(
      400,
      "INVALID_REQUEST",
      "Driver must be active and assigned to the selected branch",
    );
  const departure = new Date(input.departureTime);
  const arrival = new Date(input.arrivalTime);
  if (
    !Number.isFinite(departure.getTime()) ||
    !Number.isFinite(arrival.getTime()) ||
    departure >= arrival
  )
    fail(400, "INVALID_REQUEST", "Departure and arrival times are invalid");
  const overlap = {
    departureTime: { lt: arrival },
    arrivalTime: { gt: departure },
  };
  const [busConflict, driverConflict] = await Promise.all([
    prisma.trip.findFirst({
      where: {
        busId: input.busId,
        status: { not: "CANCELLED" },
        ...overlap,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),
    prisma.trip.findFirst({
      where: {
        driverId: input.driverId,
        status: { not: "CANCELLED" },
        ...overlap,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),
  ]);
  if (busConflict)
    fail(409, "CONFLICT", "The bus is already assigned to an overlapping trip");
  if (driverConflict)
    fail(
      409,
      "CONFLICT",
      "The driver is already assigned to an overlapping trip",
    );
  return { agencyId, departure, arrival };
}
export async function listTrips(context: AuthContext, query: ListQuery) {
  const { page, limit } = paging(query);
  const where: Prisma.TripWhereInput = {
    ...(context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(isBranchScoped(context)
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        }),
    ...(tripStatus(query.status) ? { status: tripStatus(query.status) } : {}),
    ...(query.routeId ? { routeId: query.routeId } : {}),
    ...(query.busId ? { busId: query.busId } : {}),
    ...(query.driverId ? { driverId: query.driverId } : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.travelDate ? { travelDate: new Date(query.travelDate) } : {}),
    ...(query.departureAfter
      ? { departureTime: { gte: new Date(query.departureAfter) } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { tripCode: { contains: query.search, mode: "insensitive" } },
            {
              route: { name: { contains: query.search, mode: "insensitive" } },
            },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: { route: true, bus: true, driver: true, branch: true },
      orderBy: { departureTime: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return pageResult(data, page, limit, total);
}
export async function getTrip(context: AuthContext, id: string) {
  return ownedTrip(context, id);
}
export async function createTrip(
  context: AuthContext,
  input: {
    agencyId?: string;
    branchId: string;
    routeId: string;
    busId: string;
    driverId: string;
    tripCode: string;
    travelDate: string;
    departureTime: string;
    arrivalTime: string;
    fare?: number;
    status?: TripStatus;
  },
) {
  const resources = await validateTripResources(context, input);
  try {
    const created = await prisma.trip.create({
      data: {
        ...input,
        agencyId: resources.agencyId,
        travelDate: new Date(input.travelDate),
        departureTime: resources.departure,
        arrivalTime: resources.arrival,
        status: input.status ?? "SCHEDULED",
        fare: input.fare ?? 0,
      },
    });
    await audit(context, resources.agencyId, "TRIP_CREATED", "Trip", created.id, { branchId: created.branchId, tripCode: created.tripCode, travelDate: created.travelDate.toISOString() });
    return created;
  } catch (error) {
    return handleUnique(error);
  }
}

export type RecurringTripInput = {
  agencyId?: string;
  branchId: string;
  routeId: string;
  busId: string;
  driverId: string;
  tripCode: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  departureTime: string;
  arrivalTime: string;
  fare?: number;
};

export function recurrenceDates(startDate: string, endDate: string, weekdays: number[]) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end)
    fail(400, "INVALID_REQUEST", "The recurrence date range is invalid");
  const span = Math.floor((end.getTime() - start.getTime()) / 86400000);
  if (span > 365) fail(400, "INVALID_REQUEST", "Generate no more than one year of trips at a time");
  if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
    fail(400, "INVALID_REQUEST", "Choose at least one valid weekday");
  const selected = new Set(weekdays);
  const dates = Array.from({ length: span + 1 }, (_, offset) => new Date(start.getTime() + offset * 86400000))
    .filter((date) => selected.has(date.getUTCDay()));
  if (dates.length === 0) fail(400, "INVALID_REQUEST", "No selected weekdays fall inside this date range");
  return dates;
}

async function recurringCandidates(context: AuthContext, input: RecurringTripInput) {
  const dates = recurrenceDates(input.startDate, input.endDate, input.weekdays);
  const start = new Date(`${input.startDate}T00:00:00.000Z`);
  const baseDeparture = new Date(input.departureTime);
  const baseArrival = new Date(input.arrivalTime);
  const agencyId = scopedAgency(context, input.agencyId);
  const candidates = [] as { date: string; tripCode: string; departureTime: Date; arrivalTime: Date; create: boolean; reason?: string }[];
  const planned: { departureTime: Date; arrivalTime: Date }[] = [];
  for (const date of dates) {
    const offset = Math.floor((date.getTime() - start.getTime()) / 86400000);
    const day = date.toISOString().slice(0, 10);
    const daySuffix = day.replaceAll("-", "");
    const tripCode = `${input.tripCode.trim()}-${daySuffix}`;
    const delta = offset * 86400000;
    const departureTime = new Date(baseDeparture.getTime() + delta);
    const arrivalTime = new Date(baseArrival.getTime() + delta);
    const candidate = { date: day, tripCode, departureTime, arrivalTime, create: true } as { date: string; tripCode: string; departureTime: Date; arrivalTime: Date; create: boolean; reason?: string };
    try {
      if (planned.some((trip) => trip.departureTime < arrivalTime && trip.arrivalTime > departureTime))
        throw new Error("Overlaps another generated trip in this series");
      const duplicate = await prisma.trip.findFirst({ where: { agencyId, tripCode } });
      if (duplicate) throw new Error("Generated trip code already exists");
      await validateTripResources(context, { ...input, agencyId, departureTime: departureTime.toISOString(), arrivalTime: arrivalTime.toISOString() });
      planned.push({ departureTime, arrivalTime });
    } catch (error) {
      candidate.create = false;
      candidate.reason = error instanceof Error ? error.message : "Trip conflicts with an existing assignment";
    }
    candidates.push(candidate);
  }
  return { agencyId, candidates };
}

export async function previewRecurringTrips(context: AuthContext, input: RecurringTripInput) {
  const { candidates } = await recurringCandidates(context, input);
  return candidates.map(({ date, tripCode, departureTime, arrivalTime, create, reason }) => ({ date, tripCode, departureTime: departureTime.toISOString(), arrivalTime: arrivalTime.toISOString(), create, reason }));
}

export async function createRecurringTrips(context: AuthContext, input: RecurringTripInput) {
  const { agencyId, candidates } = await recurringCandidates(context, input);
  const created = [];
  const skipped = [] as { date: string; tripCode: string; reason: string }[];
  for (const candidate of candidates) {
    if (!candidate.create) {
      skipped.push({ date: candidate.date, tripCode: candidate.tripCode, reason: candidate.reason ?? "Conflict" });
      continue;
    }
    try {
      created.push(await createTrip(context, { ...input, agencyId, tripCode: candidate.tripCode, travelDate: `${candidate.date}T00:00:00.000Z`, departureTime: candidate.departureTime.toISOString(), arrivalTime: candidate.arrivalTime.toISOString(), status: "SCHEDULED" }));
    } catch (error) {
      skipped.push({ date: candidate.date, tripCode: candidate.tripCode, reason: error instanceof Error ? error.message : "Unable to create trip" });
    }
  }
  await audit(context, agencyId, "RECURRING_TRIPS_GENERATED", "TripSeries", undefined, { branchId: input.branchId, created: created.length, skipped: skipped.length, startDate: input.startDate, endDate: input.endDate });
  return { created, skipped };
}
export async function updateTrip(
  context: AuthContext,
  id: string,
  input: Partial<{
    branchId: string;
    routeId: string;
    busId: string;
    driverId: string;
    tripCode: string;
    travelDate: string;
    departureTime: string;
    arrivalTime: string;
    fare: number;
    status: TripStatus;
  }>,
) {
  const current = await ownedTrip(context, id);
  const merged = {
    agencyId: current.agencyId,
    branchId: input.branchId ?? current.branchId,
    routeId: input.routeId ?? current.routeId,
    busId: input.busId ?? current.busId,
    driverId: input.driverId ?? current.driverId,
    departureTime: input.departureTime ?? current.departureTime.toISOString(),
    arrivalTime: input.arrivalTime ?? current.arrivalTime.toISOString(),
    fare: input.fare ?? Number(current.fare),
  };
  const resources = await validateTripResources(context, merged, id);
  try {
    const updated = await prisma.trip.update({
      where: { id },
      data: {
        ...input,
        agencyId: current.agencyId,
        travelDate: input.travelDate ? new Date(input.travelDate) : undefined,
        departureTime: resources.departure,
        arrivalTime: resources.arrival,
      },
    });
    await audit(context, current.agencyId, "TRIP_UPDATED", "Trip", updated.id, { branchId: updated.branchId, tripCode: updated.tripCode });
    return updated;
  } catch (error) {
    return handleUnique(error);
  }
}
export async function cancelTrip(context: AuthContext, id: string) {
  const current = await ownedTrip(context, id);
  const updated = await prisma.trip.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit(context, current.agencyId, "TRIP_CANCELLED", "Trip", id, { branchId: current.branchId, tripCode: current.tripCode });
  return updated;
}
