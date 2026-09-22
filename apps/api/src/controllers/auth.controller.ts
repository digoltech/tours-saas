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
} from "../services/auth.service.js";

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8),
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
