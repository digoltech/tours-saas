import { Router } from "express";
import {
  authenticate,
  requirePermission,
  requireRole,
} from "../middleware/auth.js";
import * as controller from "../controllers/booking.controller.js";

export const bookingRouter = Router();
bookingRouter.use(authenticate, requirePermission("booking:read"));
bookingRouter.get("/bookings/search", controller.searchTrips);
bookingRouter.get("/bookings", controller.list);
bookingRouter.get("/bookings/summary", controller.summary);
bookingRouter.get("/bookings/trips/:tripId/seats", controller.availability);
bookingRouter.post(
  "/bookings/holds",
  requirePermission("booking:create"),
  controller.hold,
);
bookingRouter.delete(
  "/bookings/holds/:token",
  requirePermission("booking:create"),
  controller.release,
);
bookingRouter.post(
  "/bookings",
  requirePermission("booking:create"),
  controller.confirm,
);
bookingRouter.get("/bookings/pnr/:pnr", controller.byPnr);
bookingRouter.get("/bookings/discount-cap", controller.getDiscountCap);
bookingRouter.put(
  "/bookings/discount-cap",
  requireRole("AGENCY_ADMIN"),
  controller.updateDiscountCap,
);
bookingRouter.get("/buses/:id/seat-layout", controller.getLayout);
bookingRouter.put(
  "/buses/:id/seat-layout",
  requirePermission("bus:update"),
  controller.saveLayout,
);
