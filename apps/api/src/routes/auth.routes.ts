import { Router } from "express";
import { acceptInvitationController, changePassword, confirmEmail, confirmResetOtp, forgotPassword, invitationDetails, login, logout, me, onboarding, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();
authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/forgot-password/verify", confirmResetOtp);
authRouter.post("/forgot-password/reset", changePassword);
authRouter.get("/verify-email", confirmEmail);
authRouter.get("/invitations/:token", invitationDetails);
authRouter.post("/invitations/accept", acceptInvitationController);
authRouter.get("/me", authenticate, me);
authRouter.post("/onboarding", authenticate, onboarding);
authRouter.post("/logout", logout);
