import type { Request, Response } from "express";
import { z } from "zod";
import * as service from "../services/booking.service.js";
import { sendError } from "../utils/api-response.js";

async function run(
  request: Request,
  response: Response,
  action: () => Promise<unknown>,
  status = 200,
) {
  try {
    return response
      .status(status)
      .json({ success: true, data: await action() });
  } catch (error) {
    if (error instanceof z.ZodError)
      return sendError(
        response,
        400,
        "INVALID_REQUEST",
        "Request inputs are invalid",
      );
    const item = error as { statusCode?: number; code?: string };
    return sendError(
      response,
      item.statusCode ?? 500,
      item.code ?? "INTERNAL_SERVER_ERROR",
      error instanceof Error ? error.message : "Request failed",
    );
  }
}
const id = z.string().min(1);
export const searchTrips = (r: Request, s: Response) =>
  run(r, s, () =>
    service.searchTrips(
      r.auth!,
      z
        .object({
          source: z.string().min(1),
          destination: z.string().min(1),
          date: z.string(),
        })
        .parse(r.query),
    ),
  );
export const availability = (r: Request, s: Response) =>
  run(r, s, () => service.tripAvailability(r.auth!, id.parse(r.params.tripId)));
export const hold = (r: Request, s: Response) =>
  run(
    r,
    s,
    () =>
      service.holdSeats(
        r.auth!,
        z
          .object({
            tripId: id,
            seats: z.array(z.string().min(1)).min(1),
            holdToken: z.string().uuid().optional(),
          })
          .parse(r.body),
      ),
    201,
  );
export const release = (r: Request, s: Response) =>
  run(r, s, () => service.releaseHold(r.auth!, id.parse(r.params.token)));
const bookingPayload = z.object({
  tripId: id,
  holdToken: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  boardingStopId: id,
  dropOffStopId: id,
  discountType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  discountValue: z.number().min(0).optional(),
  passengers: z
    .array(
      z.object({
        seatName: z.string().min(1),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        age: z.number().int().min(0).max(120),
        gender: z.string().min(1),
        phone: z.string().min(5),
        email: z.string().email().optional().or(z.literal("")),
        documentType: z.string().optional(),
        documentReference: z.string().optional(),
      }),
    )
    .min(1),
});
export const confirm = (r: Request, s: Response) =>
  run(
    r,
    s,
    () => service.confirmBooking(r.auth!, bookingPayload.parse(r.body)),
    201,
  );
export const byPnr = (r: Request, s: Response) =>
  run(r, s, () => service.getBookingByPnr(r.auth!, id.parse(r.params.pnr)));
export const list = (r: Request, s: Response) =>
  run(r, s, () =>
    service.listBookings(
      r.auth!,
      z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          pnr: z.string().optional(),
          tripCode: z.string().optional(),
          date: z.string().optional(),
        })
        .parse(r.query),
    ),
  );
export const summary = (r: Request, s: Response) =>
  run(r, s, () => service.getBookingDashboardSummary(r.auth!));
export const getLayout = (r: Request, s: Response) =>
  run(r, s, () => service.getSeatLayout(r.auth!, id.parse(r.params.id)));
export const saveLayout = (r: Request, s: Response) =>
  run(r, s, () =>
    service.saveSeatLayout(
      r.auth!,
      id.parse(r.params.id),
      z
        .object({
          rows: z.number().int().min(1).max(26),
          columns: z.number().int().min(1).max(8),
          disabledSeats: z.array(z.string()),
        })
        .parse(r.body),
    ),
  );
export const getDiscountCap = (r: Request, s: Response) =>
  run(r, s, () => service.getDiscountCap(r.auth!));
export const updateDiscountCap = (r: Request, s: Response) =>
  run(r, s, () =>
    service.updateDiscountCap(
      r.auth!,
      z
        .object({
          type: z.enum(["FIXED", "PERCENTAGE"]),
          value: z.number().min(0).max(100000),
        })
        .refine((input) => input.type !== "PERCENTAGE" || input.value <= 100, {
          message: "Percentage discount cap cannot exceed 100",
        })
        .parse(r.body),
    ),
  );
