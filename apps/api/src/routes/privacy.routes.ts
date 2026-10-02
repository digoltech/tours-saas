import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { publicFormLimit } from "../middleware/rate-limit.js";
import * as controller from "../controllers/privacy.controller.js";

export const privacyRouter = Router();
privacyRouter.post("/privacy/public-requests", ...publicFormLimit, controller.publicSubmit);
privacyRouter.post("/privacy/requests", authenticate, controller.staffSubmit);
privacyRouter.get("/privacy/requests", authenticate, controller.list);
privacyRouter.post("/privacy/requests/:id/review", authenticate, controller.review);
privacyRouter.get("/privacy/requests/:id/export", authenticate, controller.exportData);
