import type { NextFunction, Request, Response } from "express";
import {
  verifySession,
  toAuthContext,
  accountIsActive,
} from "../services/auth.service.js";
import { AUTH_COOKIE, readCookie } from "../utils/cookies.js";
import { sendError } from "../utils/api-response.js";
import { canAccessTenant } from "./tenant-policy.js";

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  // Routers may overlap (for example booking payments). Authenticate once per request,
  // while retaining a fresh database session/permission check on every new request.
  if (request.auth) return next();
  try {
    const token = readCookie(request, AUTH_COOKIE) ?? readBearerToken(request);
    if (!token)
      return sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Authentication is required",
      );
    const user = await verifySession(token);
    if (!user || !accountIsActive(user))
      return sendError(
        response,
        401,
        "INVALID_SESSION",
        "Authentication is invalid or expired",
      );
    request.auth = toAuthContext(user);
    if (
      !request.auth.emailVerified &&
      !["/me", "/onboarding", "/verify-email/resend"].includes(request.path)
    )
      return sendError(
        response,
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        "Verify your email address to continue",
      );
    return next();
  } catch {
    return sendError(
      response,
      401,
      "INVALID_SESSION",
      "Authentication is invalid or expired",
    );
  }
}

function readBearerToken(request: Request) {
  const value = request.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : undefined;
}

export function requireRole(...roles: string[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth)
      return sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Authentication is required",
      );
    if (!roles.includes(request.auth.role))
      return sendError(
        response,
        403,
        "FORBIDDEN",
        "You do not have access to this resource",
      );
    return next();
  };
}

export function requirePermission(permission: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth)
      return sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Authentication is required",
      );
    if (
      request.auth.role !== "SUPER_ADMIN" &&
      !request.auth.permissions.includes(permission)
    )
      return sendError(
        response,
        403,
        "FORBIDDEN",
        "You do not have permission to perform this action",
      );
    return next();
  };
}

export function requireTenantAccess(
  getTarget: (request: Request) => { agencyId?: string; branchId?: string },
) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth)
      return sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Authentication is required",
      );
    const target = getTarget(request);
    if (
      !target.agencyId ||
      !canAccessTenant(request.auth, target.agencyId, target.branchId)
    )
      return sendError(
        response,
        403,
        "FORBIDDEN",
        "You do not have access to this agency or branch",
      );
    return next();
  };
}
