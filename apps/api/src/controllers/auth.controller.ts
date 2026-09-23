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
