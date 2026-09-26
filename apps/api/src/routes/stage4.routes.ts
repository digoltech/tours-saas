import { Router } from "express";
import {
  authenticate,
  requirePermission,
  requireRole,
} from "../middleware/auth.js";
import * as controller from "../controllers/stage4.controller.js";

export const stage4Router = Router();
stage4Router.use(authenticate);
stage4Router.get("/notifications", controller.notifications);
stage4Router.get("/notifications/preferences", controller.preferences);
stage4Router.put("/notifications/preferences", controller.notifications);
stage4Router.post("/notifications/:id/read", controller.markRead);
stage4Router.post(
  "/bookings/:id/cancellation-request",
  requirePermission("booking:read"),
  controller.requestCancellation,
);
stage4Router.get(
  "/cancellation-requests",
  requirePermission("finance:cancel"),
  controller.cancellationRequests,
);
stage4Router.post(
  "/cancellation-requests/:id/review",
  requirePermission("finance:cancel"),
  controller.cancellationRequests,
);
stage4Router.get("/agency/settings", controller.agencySettings);
stage4Router.put(
  "/agency/settings",
  requireRole("AGENCY_ADMIN"),
  controller.agencySettings,
);
stage4Router.get(
  "/audit-logs",
  requirePermission("finance:read"),
  controller.auditLogs,
);
stage4Router.get("/subscription", controller.subscription);
stage4Router.put("/subscription", controller.subscription);
stage4Router.put(
  "/admin/agencies/:agencyId/subscription",
  requireRole("SUPER_ADMIN"),
  controller.adminSubscription,
);
stage4Router.get(
  "/admin/agencies/:agencyId/subscription",
  requireRole("SUPER_ADMIN"),
  controller.adminSubscriptionGet,
);
stage4Router.get("/subscription/invoices", controller.invoices);
stage4Router.post(
  "/subscription/invoices",
  requireRole("SUPER_ADMIN"),
  controller.invoices,
);
stage4Router.post(
  "/subscription/invoices/:id/paid",
  controller.markInvoicePaid,
);
