import { BusType, Prisma, RecordStatus, TripStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";

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
    (context.role !== "BRANCH_ADMIN" && context.role !== "AGENT") ||
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
          ...(context.role === "BRANCH_ADMIN" || context.role === "AGENT"
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
  },
) {
  const agencyId = scopedAgency(context, input.agencyId);
  await branchInAgency(context, agencyId, input.branchId);
  try {
    return await prisma.bus.create({
      data: {
        ...input,
        agencyId,
        registrationNumber: input.registrationNumber.trim().toUpperCase(),
        busNumber: input.busNumber.trim(),
        operatorName: input.operatorName?.trim() || null,
      },
    });
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
  }>,
) {
  const current = await getBus(context, id);
  if (input.branchId)
    await branchInAgency(context, current.agencyId, input.branchId);
  try {
    return await prisma.bus.update({
      where: { id },
      data: {
        ...input,
        registrationNumber: input.registrationNumber?.trim().toUpperCase(),
        busNumber: input.busNumber?.trim(),
        operatorName: input.operatorName?.trim() || null,
      },
    });
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateBus(context: AuthContext, id: string) {
  await getBus(context, id);
  return prisma.bus.update({ where: { id }, data: { status: "INACTIVE" } });
}

export async function listDrivers(context: AuthContext, query: ListQuery) {
  const { page, limit } = paging(query);
  const where: Prisma.DriverWhereInput = {
    ...(context.role === "SUPER_ADMIN"
      ? {}
      : {
          agencyId: context.agencyId ?? "__missing__",
          ...(context.role === "BRANCH_ADMIN" || context.role === "AGENT"
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
    return await prisma.driver.create({
      data: {
        ...input,
        agencyId,
        email: input.email?.trim() || null,
        licenseExpiryDate: input.licenseExpiryDate
          ? new Date(input.licenseExpiryDate)
          : null,
      },
    });
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
    return await prisma.driver.update({
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
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateDriver(context: AuthContext, id: string) {
  await getDriver(context, id);
  return prisma.driver.update({ where: { id }, data: { status: "INACTIVE" } });
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
    return await prisma.route.create({
      data: {
        ...input,
        agencyId,
        code: input.code.trim().toUpperCase(),
        description: input.description?.trim() || null,
      },
    });
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
  await getRoute(context, id);
  try {
    return await prisma.route.update({
      where: { id },
      data: { ...input, code: input.code?.trim().toUpperCase() },
    });
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateRoute(context: AuthContext, id: string) {
  await getRoute(context, id);
  return prisma.route.update({ where: { id }, data: { status: "INACTIVE" } });
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
  await getRoute(context, routeId);
  try {
    return await prisma.stop.create({
      data: {
        ...input,
        routeId,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
      },
    });
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
  await ownedStop(context, id);
  try {
    return await prisma.stop.update({ where: { id }, data: input });
  } catch (error) {
    return handleUnique(error);
  }
}
export async function deactivateStop(context: AuthContext, id: string) {
  await ownedStop(context, id);
  return prisma.stop.update({ where: { id }, data: { status: "INACTIVE" } });
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
  await ownedStop(context, stopId);
  try {
    return await prisma.boardingPoint.upsert({
      where: { stopId_pointType: { stopId, pointType: input.pointType } },
      create: { stopId, ...input },
      update: input,
    });
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
        ...overlap,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),
    prisma.trip.findFirst({
      where: {
        driverId: input.driverId,
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
          ...(context.role === "BRANCH_ADMIN" || context.role === "AGENT"
            ? { branchId: context.branchId ?? "__missing__" }
            : {}),
        }),
    ...(tripStatus(query.status) ? { status: tripStatus(query.status) } : {}),
    ...(query.routeId ? { routeId: query.routeId } : {}),
    ...(query.busId ? { busId: query.busId } : {}),
    ...(query.driverId ? { driverId: query.driverId } : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.travelDate ? { travelDate: new Date(query.travelDate) } : {}),
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
    status?: TripStatus;
  },
) {
  const resources = await validateTripResources(context, input);
  try {
    return await prisma.trip.create({
      data: {
        ...input,
        agencyId: resources.agencyId,
        travelDate: new Date(input.travelDate),
        departureTime: resources.departure,
        arrivalTime: resources.arrival,
        status: input.status ?? "SCHEDULED",
      },
    });
  } catch (error) {
    return handleUnique(error);
  }
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
  };
  const resources = await validateTripResources(context, merged, id);
  try {
    return await prisma.trip.update({
      where: { id },
      data: {
        ...input,
        agencyId: current.agencyId,
        travelDate: input.travelDate ? new Date(input.travelDate) : undefined,
        departureTime: resources.departure,
        arrivalTime: resources.arrival,
      },
    });
  } catch (error) {
    return handleUnique(error);
  }
}
export async function cancelTrip(context: AuthContext, id: string) {
  await ownedTrip(context, id);
  return prisma.trip.update({ where: { id }, data: { status: "CANCELLED" } });
}
