import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import * as controller from "../controllers/finance.controller.js";

export const financeRouter = Router();
financeRouter.use(authenticate);
financeRouter.get("/finance/settings", requirePermission("finance:read"), controller.settings);
financeRouter.put("/finance/settings", requirePermission("finance:settings"), controller.settings);
financeRouter.get("/finance/bookings/pnr/:pnr", requirePermission("finance:read"), controller.bookingFinance);
financeRouter.post("/bookings/:id/payments", requirePermission("finance:payment"), controller.payment);
financeRouter.post("/bookings/:id/cancel", requirePermission("finance:cancel"), controller.cancellation);
financeRouter.post("/bookings/:id/refunds", requirePermission("finance:refund"), controller.refund);
financeRouter.post("/finance/settlements", requirePermission("finance:settlement"), controller.settlement);
financeRouter.get("/finance/ledger", requirePermission("finance:read"), controller.ledger);
financeRouter.get("/finance/reports", requirePermission("finance:read"), controller.reports);
financeRouter.get("/finance/reports/export/:format", requirePermission("finance:read"), controller.exportReport);
