import { Router } from "express";
import { rateLimit } from "../middleware/rate-limit.js";
import { subscribe, confirm, unsubscribe } from "../controllers/newsletter.controller.js";

export const newsletterRouter = Router();
newsletterRouter.post("/subscribe", rateLimit("newsletter-subscribe", 5, 3600), subscribe);
newsletterRouter.post("/confirm", rateLimit("newsletter-confirm", 20, 3600), confirm);
newsletterRouter.post("/unsubscribe", rateLimit("newsletter-unsubscribe", 20, 3600), unsubscribe);
