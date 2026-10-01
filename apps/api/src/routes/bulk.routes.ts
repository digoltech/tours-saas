import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as controller from "../controllers/bulk.controller.js";
export const bulkRouter = Router();
bulkRouter.use(authenticate);
bulkRouter.get("/bulk/:entity/template", controller.template);
bulkRouter.get("/bulk/:entity/export", controller.exportEntity);
bulkRouter.post("/bulk/:entity/import", controller.importEntity);
