import type { Request, Response } from "express";
import { z } from "zod";
import { TripStatus } from "@prisma/client";
import * as service from "../services/transport.service.js";
import { sendError } from "../utils/api-response.js";

type Controller = (request: Request, response: Response) => Promise<unknown>;
const id = z.string().min(1);
const list = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  branchId: z.string().optional(),
  busType: z.string().optional(),
  routeId: z.string().optional(),
  busId: z.string().optional(),
  driverId: z.string().optional(),
  travelDate: z.string().optional(),
  departureAfter: z.string().datetime().optional(),
});
const agency = z.string().min(1).optional();
const status = z.enum(["ACTIVE", "INACTIVE"]).optional();
function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
function errors(response: Response, error: unknown) {
  const item = error as { statusCode?: number; code?: string };
  return sendError(
    response,
    item.statusCode ?? 500,
    item.code ?? "INTERNAL_SERVER_ERROR",
    error instanceof Error ? error.message : "Request failed",
  );
}
function wrap(fn: (request: Request) => Promise<unknown>): Controller {
  return async (request, response) => {
    try {
      return response.json({ success: true, data: await fn(request) });
    } catch (error) {
      if (error instanceof z.ZodError)
        return sendError(
          response,
          400,
          "INVALID_REQUEST",
          "Request inputs are invalid",
        );
      return errors(response, error);
    }
  };
}
function created(fn: (request: Request) => Promise<unknown>): Controller {
  return async (request, response) => {
    try {
      return response
        .status(201)
        .json({ success: true, data: await fn(request) });
    } catch (error) {
      if (error instanceof z.ZodError)
        return sendError(
          response,
          400,
          "INVALID_REQUEST",
          "Request inputs are invalid",
        );
      return errors(response, error);
    }
  };
}

const busPayload = z.object({
  agencyId: agency,
  branchId: id,
  registrationNumber: z.string().min(2),
  busNumber: z.string().min(1),
  operatorName: z.string().optional(),
  busType: z.enum(["SEATER", "SLEEPER", "SEATER_SLEEPER"]),
  totalSeats: z.coerce.number().int().min(1).max(1000),
  make: z.string().max(80).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  year: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  color: z.string().max(60).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  amenities: z.array(z.string().max(60)).max(30).optional(),
  photos: z.array(z.string().url()).max(12).optional(),
});
export const listBusesController = wrap(async (r) => {
  const q = list.parse(r.query);
  return service.listBuses(r.auth!, q);
});
export const getBusController = wrap(async (r) =>
  service.getBus(r.auth!, id.parse(param(r.params.id))),
);
export const createBusController = created(async (r) =>
  service.createBus(r.auth!, busPayload.parse(r.body)),
);
export const updateBusController = wrap(async (r) =>
  service.updateBus(
    r.auth!,
    id.parse(param(r.params.id)),
    busPayload
      .partial()
      .omit({ agencyId: true })
      .extend({ status })
      .parse(r.body),
  ),
);
export const deleteBusController = wrap(async (r) =>
  service.deactivateBus(r.auth!, id.parse(param(r.params.id))),
);

const driverPayload = z.object({
  agencyId: agency,
  branchId: id,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal("")),
  licenseNumber: z.string().min(2),
  licenseExpiryDate: z.string().datetime().optional(),
});
export const listDriversController = wrap(async (r) => {
  const q = list.parse(r.query);
  return service.listDrivers(r.auth!, q);
});
export const getDriverController = wrap(async (r) =>
  service.getDriver(r.auth!, id.parse(param(r.params.id))),
);
export const createDriverController = created(async (r) =>
  service.createDriver(r.auth!, driverPayload.parse(r.body)),
);
export const updateDriverController = wrap(async (r) =>
  service.updateDriver(
    r.auth!,
    id.parse(param(r.params.id)),
    driverPayload
      .partial()
      .omit({ agencyId: true })
      .extend({ status })
      .parse(r.body),
  ),
);
export const deleteDriverController = wrap(async (r) =>
  service.deactivateDriver(r.auth!, id.parse(param(r.params.id))),
);

const routePayload = z.object({
  agencyId: agency,
  name: z.string().min(2),
  code: z.string().min(1),
  source: z.string().min(1),
  destination: z.string().min(1),
  description: z.string().optional(),
});
export const listRoutesController = wrap(async (r) => {
  const q = list.parse(r.query);
  return service.listRoutes(r.auth!, q);
});
export const getRouteController = wrap(async (r) =>
  service.getRoute(r.auth!, id.parse(param(r.params.id))),
);
export const createRouteController = created(async (r) =>
  service.createRoute(r.auth!, routePayload.parse(r.body)),
);
export const updateRouteController = wrap(async (r) =>
  service.updateRoute(
    r.auth!,
    id.parse(param(r.params.id)),
    routePayload
      .partial()
      .omit({ agencyId: true })
      .extend({ status })
      .parse(r.body),
  ),
);
export const deleteRouteController = wrap(async (r) =>
  service.deactivateRoute(r.auth!, id.parse(param(r.params.id))),
);

const stopPayload = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  sequence: z.coerce.number().int().min(1),
  estimatedMinutesFromOrigin: z.coerce.number().int().min(0).optional(),
});
export const listStopsController = wrap(async (r) =>
  service.listStops(r.auth!, id.parse(param(r.params.routeId))),
);
export const getStopController = wrap(async (r) =>
  service.getStop(r.auth!, id.parse(param(r.params.id))),
);
export const createStopController = created(async (r) =>
  service.createStop(
    r.auth!,
    id.parse(param(r.params.routeId)),
    stopPayload.parse(r.body),
  ),
);
export const updateStopController = wrap(async (r) =>
  service.updateStop(
    r.auth!,
    id.parse(param(r.params.id)),
    stopPayload.partial().extend({ status }).parse(r.body),
  ),
);
export const deleteStopController = wrap(async (r) =>
  service.deactivateStop(r.auth!, id.parse(param(r.params.id))),
);
const pointPayload = z.object({
  pointType: z.enum(["BOARDING", "DROP_OFF", "BOTH"]),
  timeOffset: z.coerce.number().int().min(0).optional(),
  status,
});
export const upsertPointController = wrap(async (r) =>
  service.upsertPoint(
    r.auth!,
    id.parse(param(r.params.stopId)),
    pointPayload.parse(r.body),
  ),
);

const tripPayload = z.object({
  agencyId: agency,
  branchId: id,
  routeId: id,
  busId: id,
  driverId: id,
  tripCode: z.string().min(1),
  travelDate: z.string().datetime(),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  fare: z.coerce.number().min(0).optional(),
  status: z.enum(TripStatus).optional(),
});
export const listTripsController = wrap(async (r) => {
  const q = list.parse(r.query);
  return service.listTrips(r.auth!, q);
});
export const getTripController = wrap(async (r) =>
  service.getTrip(r.auth!, id.parse(param(r.params.id))),
);
export const createTripController = created(async (r) =>
  service.createTrip(r.auth!, tripPayload.parse(r.body)),
);
export const updateTripController = wrap(async (r) =>
  service.updateTrip(
    r.auth!,
    id.parse(param(r.params.id)),
    tripPayload.partial().omit({ agencyId: true }).parse(r.body),
  ),
);
export const deleteTripController = wrap(async (r) =>
  service.cancelTrip(r.auth!, id.parse(param(r.params.id))),
);
