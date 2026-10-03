import { Router } from "express";
import { rateLimit } from "../middleware/rate-limit.js";
import { sendContactInquiry } from "../controllers/contact.controller.js";

export const contactRouter = Router();
contactRouter.post("/", rateLimit("contact-inquiry", 5, 3600), sendContactInquiry);
