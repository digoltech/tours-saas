import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as controller from "../controllers/roles.controller.js";

export const rolesRouter = Router();
rolesRouter.use("/agency/roles", authenticate);
rolesRouter.get("/agency/roles", controller.listRoles);
rolesRouter.post("/agency/roles", controller.createRole);
rolesRouter.patch("/agency/roles/:id", controller.updateRole);
rolesRouter.delete("/agency/roles/:id", controller.deleteRole);
rolesRouter.patch("/agency/roles/users/:userId", controller.assignUserRole);
rolesRouter.post(
  "/agency/roles/users/:userId/customize",
  controller.customizeUserRole,
);
