import type { Request, Response } from "express";
import { z } from "zod";
import * as service from "../services/bulk-data.service.js";
import { sendError } from "../utils/api-response.js";

const entitySchema = z.enum(["buses", "drivers", "routes", "stops"]);
const permissions = { buses: "bus", drivers: "driver", routes: "route", stops: "stop" } as const;
function checkAccess(req: Request, res: Response, entity: keyof typeof permissions, action: "read" | "create") {
  if (req.auth?.role === "SUPER_ADMIN" || req.auth?.permissions.includes(`${permissions[entity]}:${action}`)) return true;
  sendError(res, 403, "FORBIDDEN", "You do not have permission to use this bulk operation");
  return false;
}
async function run(res: Response, action: () => Promise<unknown>, status = 200) {
  try { return res.status(status).json({ success: true, data: await action() }); }
  catch (error) {
    const e = error as { statusCode?: number; code?: string };
    return sendError(res, e.statusCode ?? 500, e.code ?? "INTERNAL_SERVER_ERROR", error instanceof Error ? error.message : "Request failed");
  }
}
function resolveEntity(req: Request, res: Response) {
  const parsed = entitySchema.safeParse(req.params.entity);
  if (!parsed.success) { sendError(res, 404, "NOT_FOUND", "Bulk entity not found"); return null; }
  return parsed.data;
}
export const template = (req: Request, res: Response) => {
  const entity = resolveEntity(req, res);
  if (!entity) return;
  const allowed = req.auth?.role === "SUPER_ADMIN" || req.auth?.permissions.includes(`${permissions[entity]}:read`) || req.auth?.permissions.includes(`${permissions[entity]}:create`);
  if (!allowed) { sendError(res, 403, "FORBIDDEN", "You do not have permission to download this template"); return; }
  res.type("text/csv").send(service.template(entity));
};
export const exportEntity = (req: Request, res: Response) => {
  const entity = resolveEntity(req, res);
  if (!entity || !checkAccess(req, res, entity, "read")) return;
  void service.exportRows(req.auth!, entity, typeof req.query.agencyId === "string" ? req.query.agencyId : undefined)
    .then((csv) => res.type("text/csv").setHeader("Content-Disposition", `attachment; filename="${entity}.csv"`).send(csv))
    .catch((error) => {
      const e = error as { statusCode?: number; code?: string };
      sendError(res, e.statusCode ?? 500, e.code ?? "INTERNAL_SERVER_ERROR", error instanceof Error ? error.message : "Export failed");
    });
};
export const importEntity = (req: Request, res: Response) => {
  const entity = resolveEntity(req, res);
  if (!entity || !checkAccess(req, res, entity, "create")) return;
  const payload = z.object({
    rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))).max(500),
    commit: z.boolean(), agencyId: z.string().min(1).optional(),
  }).safeParse(req.body);
  if (!payload.success) return sendError(res, 400, "INVALID_REQUEST", "Upload contains invalid data or more than 500 rows");
  return run(res, () => service.importRows(req.auth!, entity, payload.data.rows, payload.data.commit, payload.data.agencyId));
};
