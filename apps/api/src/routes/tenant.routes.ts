import { Router } from "express";
import { tenantAccess } from "../controllers/tenant.controller.js";
import {
  authenticate,
  requirePermission,
  requireTenantAccess,
} from "../middleware/auth.js";

export const tenantRouter = Router();

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

tenantRouter.get(
  "/:agencyId/access",
  authenticate,
  requirePermission("agency:read"),
  requireTenantAccess((request) => ({
    agencyId: param(request.params.agencyId),
  })),
  tenantAccess,
);

tenantRouter.get(
  "/:agencyId/branches/:branchId/access",
  authenticate,
  requirePermission("branch:read"),
  requireTenantAccess((request) => ({
    agencyId: param(request.params.agencyId),
    branchId: param(request.params.branchId),
  })),
  tenantAccess,
);
