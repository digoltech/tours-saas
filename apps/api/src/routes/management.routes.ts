import { Router } from "express";
import {
  createAgencyController,
  createAgentController,
  createBranchController,
  deleteAgencyController,
  deleteAgentController,
  deleteBranchController,
  getAgencyController,
  getAgentController,
  getBranchController,
  getSummary,
  listAgenciesController,
  listAgentsController,
  listBranchesController,
  updateAgencyController,
  updateAgentController,
  updateBranchController,
} from "../controllers/management.controller.js";
import { authenticate, requirePermission, requireTenantAccess } from "../middleware/auth.js";

export const managementRouter = Router();

function passId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

managementRouter.get(
  "/dashboard/summary",
  authenticate,
  requirePermission("agency:read"),
  getSummary,
);

managementRouter.get(
  "/agencies",
  authenticate,
  requirePermission("agency:read"),
  listAgenciesController,
);
managementRouter.get(
  "/agencies/:id",
  authenticate,
  requirePermission("agency:read"),
  getAgencyController,
);
managementRouter.post(
  "/agencies",
  authenticate,
  requirePermission("agency:create"),
  createAgencyController,
);
managementRouter.patch(
  "/agencies/:id",
  authenticate,
  requirePermission("agency:update"),
  requireTenantAccess((request) => ({ agencyId: passId(request.params.id) })),
  updateAgencyController,
);
managementRouter.delete(
  "/agencies/:id",
  authenticate,
  requirePermission("agency:delete"),
  requireTenantAccess((request) => ({ agencyId: passId(request.params.id) })),
  deleteAgencyController,
);

managementRouter.get(
  "/agencies/:agencyId/branches",
  authenticate,
  requirePermission("branch:read"),
  requireTenantAccess((request) => ({ agencyId: passId(request.params.agencyId) })),
  listBranchesController,
);
managementRouter.get(
  "/branches/:id",
  authenticate,
  requirePermission("branch:read"),
  getBranchController,
);
managementRouter.post(
  "/agencies/:agencyId/branches",
  authenticate,
  requirePermission("branch:create"),
  requireTenantAccess((request) => ({ agencyId: passId(request.params.agencyId) })),
  createBranchController,
);
managementRouter.patch(
  "/branches/:id",
  authenticate,
  requirePermission("branch:update"),
  updateBranchController,
);
managementRouter.delete(
  "/branches/:id",
  authenticate,
  requirePermission("branch:delete"),
  deleteBranchController,
);

managementRouter.get(
  "/agencies/:agencyId/agents",
  authenticate,
  requirePermission("agent:read"),
  requireTenantAccess((request) => ({ agencyId: passId(request.params.agencyId) })),
  listAgentsController,
);
managementRouter.get(
  "/agents/:id",
  authenticate,
  requirePermission("agent:read"),
  getAgentController,
);
managementRouter.post(
  "/agencies/:agencyId/agents",
  authenticate,
  requirePermission("agent:create"),
  requireTenantAccess((request) => ({ agencyId: passId(request.params.agencyId) })),
  createAgentController,
);
managementRouter.patch(
  "/agents/:id",
  authenticate,
  requirePermission("agent:update"),
  updateAgentController,
);
managementRouter.delete(
  "/agents/:id",
  authenticate,
  requirePermission("agent:delete"),
  deleteAgentController,
);

export default managementRouter;
