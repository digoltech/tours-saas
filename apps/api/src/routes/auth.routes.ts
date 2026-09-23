import { Router } from "express";
import { changePassword, confirmResetOtp, forgotPassword, login, logout, me, onboarding, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();
authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/forgot-password/verify", confirmResetOtp);
authRouter.post("/forgot-password/reset", changePassword);
authRouter.get("/me", authenticate, me);
authRouter.post("/onboarding", authenticate, onboarding);
authRouter.post("/logout", logout);
