import { Router } from "express";
import { login, logout, me, onboarding, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();
authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.get("/me", authenticate, me);
authRouter.post("/onboarding", authenticate, onboarding);
authRouter.post("/logout", logout);
