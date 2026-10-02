import type { RequestHandler } from "express";
import { environment } from "../config/env.js";
import { AUTH_COOKIE, readCookie } from "../utils/cookies.js";
import { sendError } from "../utils/api-response.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const requireSameOrigin: RequestHandler = (request, response, next) => {
  if (safeMethods.has(request.method)) return next();
  // Bearer-only API clients do not rely on ambient browser cookies.
  if (!readCookie(request, AUTH_COOKIE)) return next();
  const origin = request.get("origin");
  if (origin !== new URL(environment.WEB_URL).origin)
    return sendError(response, 403, "INVALID_ORIGIN", "Request origin is not allowed");
  return next();
};
