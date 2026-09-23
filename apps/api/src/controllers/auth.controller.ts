import type { Request, Response } from "express";
import { z } from "zod";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies.js";
import { sendError } from "../utils/api-response.js";
import {
  createSession,
  findUserByEmail,
  toAuthContext,
  toSafeUser,
  verifyPassword,
  registerUser,
  completeOnboarding,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} from "../services/auth.service.js";

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});
const registerSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  agencyName: z.string().trim().min(2),
  branchName: z.string().trim().min(2),
});
const onboardingSchema = z.object({
  agencyName: z.string().trim().min(2),
  branchName: z.string().trim().min(2),
  phone: z.string().trim().optional(),
});
const resetRequestSchema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()) });
const otpSchema = resetRequestSchema.extend({ otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });
const resetPasswordSchema = otpSchema.extend({ password: z.string().min(8, "Password must be at least 8 characters") });

export async function login(request: Request, response: Response) {
  const result = loginSchema.safeParse(request.body);
  if (!result.success)
    return sendError(
      response,
      400,
      "INVALID_REQUEST",
      "Enter a valid email and password",
    );
  const user = await findUserByEmail(result.data.email);
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !(await verifyPassword(result.data.password, user.passwordHash))
  )
    return sendError(
      response,
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );
  const context = toAuthContext(user);
  setAuthCookie(response, await createSession(context));
  return response.json({ success: true, data: { user: toSafeUser(context) } });
}

export async function register(request: Request, response: Response) {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) return sendError(response, 400, "INVALID_REQUEST", "Complete all registration fields with valid values");
  try {
    const user = await registerUser(result.data);
    const context = toAuthContext(user);
    setAuthCookie(response, await createSession(context));
    return response.status(201).json({ success: true, data: { user: toSafeUser(context) } });
  } catch (error) {
    const item = error as { statusCode?: number; code?: string };
    return sendError(response, item.statusCode ?? 500, item.code ?? "INTERNAL_SERVER_ERROR", error instanceof Error ? error.message : "Unable to register");
  }
}

export async function onboarding(request: Request, response: Response) {
  const result = onboardingSchema.safeParse(request.body);
  if (!result.success) return sendError(response, 400, "INVALID_REQUEST", "Complete the onboarding fields with valid values");
  try {
    const context = await completeOnboarding(request.auth!.userId, result.data);
    return response.json({ success: true, data: { user: toSafeUser(context) } });
  } catch (error) {
    return sendError(response, 400, "ONBOARDING_FAILED", error instanceof Error ? error.message : "Unable to complete onboarding");
  }
}

export async function forgotPassword(request: Request, response: Response) {
  const result = resetRequestSchema.safeParse(request.body);
  if (!result.success) return sendError(response, 400, "INVALID_REQUEST", "Enter a valid email address");
  try {
    await requestPasswordReset(result.data.email);
    return response.json({ success: true, data: { message: "If an account exists, a reset code has been sent." } });
  } catch {
    return sendError(response, 503, "EMAIL_UNAVAILABLE", "Password reset email could not be sent right now");
  }
}

export async function confirmResetOtp(request: Request, response: Response) {
  const result = otpSchema.safeParse(request.body);
  if (!result.success) return sendError(response, 400, "INVALID_REQUEST", "Enter your email and 6-digit code");
  try {
    await verifyPasswordResetOtp(result.data.email, result.data.otp);
    return response.json({ success: true, data: { verified: true } });
  } catch (error) {
    const item = error as { statusCode?: number; code?: string };
    return sendError(response, item.statusCode ?? 400, item.code ?? "INVALID_OTP", error instanceof Error ? error.message : "The reset code is invalid or expired");
  }
}

export async function changePassword(request: Request, response: Response) {
  const result = resetPasswordSchema.safeParse(request.body);
  if (!result.success) return sendError(response, 400, "INVALID_REQUEST", "Enter your email, code, and a valid new password");
  try {
    await resetPassword(result.data.email, result.data.otp, result.data.password);
    return response.json({ success: true, data: { reset: true } });
  } catch (error) {
    const item = error as { statusCode?: number; code?: string };
    return sendError(response, item.statusCode ?? 400, item.code ?? "RESET_FAILED", error instanceof Error ? error.message : "Unable to reset password");
  }
}

export function me(request: Request, response: Response) {
  if (!request.auth)
    return sendError(
      response,
      401,
      "UNAUTHENTICATED",
      "Authentication is required",
    );
  return response.json({ success: true, data: toSafeUser(request.auth) });
}

export function logout(_request: Request, response: Response) {
  clearAuthCookie(response);
  return response.json({ success: true, data: { loggedOut: true } });
}
