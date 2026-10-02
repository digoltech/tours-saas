import { Router } from "express";
import { acceptInvitationController, changePassword, confirmEmail, confirmResetOtp, forgotPassword, invitationDetails, login, logout, me, onboarding, register, resendVerification } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { loginLimit, registerLimit, resetLimit, otpLimit, verificationLimit } from "../middleware/rate-limit.js";

export const authRouter = Router();
authRouter.post("/login", ...loginLimit, login);
authRouter.post("/register", registerLimit, register);
authRouter.post("/forgot-password", ...resetLimit, forgotPassword);
authRouter.post("/forgot-password/verify", ...otpLimit, confirmResetOtp);
authRouter.post("/forgot-password/reset", ...otpLimit, changePassword);
authRouter.post("/verify-email", verificationLimit, confirmEmail);
authRouter.post("/verify-email/resend", verificationLimit, authenticate, resendVerification);
authRouter.get("/invitations/:token", invitationDetails);
authRouter.post("/invitations/accept", acceptInvitationController);
authRouter.get("/me", authenticate, me);
authRouter.post("/onboarding", authenticate, onboarding);
authRouter.post("/logout", logout);
