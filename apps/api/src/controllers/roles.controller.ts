import type { Request, Response } from "express";
import { z } from "zod";
import * as service from "../services/roles.service.js";
import { sendError } from "../utils/api-response.js";

const roleInput = z.object({
  agencyId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(80),
  scope: z.enum(["AGENCY", "BRANCH"]),
  permissions: z.array(z.string().min(1)).max(100),
});
async function run(res: Response, action: () => Promise<unknown>, status = 200) {
  try { return res.status(status).json({ success: true, data: await action() }); }
  catch (error) {
    if (error instanceof z.ZodError) return sendError(res, 400, "INVALID_REQUEST", "Role inputs are invalid");
    const e = error as { statusCode?: number; code?: string };
    return sendError(res, e.statusCode ?? 500, e.code ?? "INTERNAL_SERVER_ERROR", error instanceof Error ? error.message : "Request failed");
  }
}
export const listRoles = (req: Request, res: Response) => run(res, () => service.listRoles(req.auth!, typeof req.query.agencyId === "string" ? req.query.agencyId : undefined));
export const createRole = (req: Request, res: Response) => run(res, () => service.createRole(req.auth!, roleInput.parse(req.body)), 201);
export const updateRole = (req: Request, res: Response) => run(res, () => service.updateRole(req.auth!, z.string().min(1).parse(req.params.id), roleInput.parse(req.body)));
export const deleteRole = (req: Request, res: Response) => run(res, () => service.deleteRole(req.auth!, z.string().min(1).parse(req.params.id), typeof req.query.agencyId === "string" ? req.query.agencyId : undefined));
export const assignUserRole = (req: Request, res: Response) => run(res, () => {
  const input = z.object({ roleId: z.string().min(1), agencyId: z.string().min(1).optional() }).parse(req.body);
  return service.assignUserRole(req.auth!, z.string().min(1).parse(req.params.userId), input.roleId, input.agencyId);
});
export const customizeUserRole = (req: Request, res: Response) => run(res, () =>
  service.customizeUserRole(req.auth!, z.string().min(1).parse(req.params.userId), roleInput.parse(req.body)), 201);
