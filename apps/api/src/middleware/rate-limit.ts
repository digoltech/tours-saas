import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { sendError } from "../utils/api-response.js";

const local = new Map<string, { count: number; expiresAt: number }>();
const maxKeys = 50_000;
let requests = 0;

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function consumeRate(key: string, windowSeconds: number): Promise<number> {
  const now = Date.now();
  const current = local.get(key);
  const active = current && current.expiresAt > now;
  const count = active ? current.count + 1 : 1;
  local.set(key, { count, expiresAt: active ? current.expiresAt : now + windowSeconds * 1000 });
  if (++requests % 1_000 === 0) {
    for (const [entryKey, entry] of local) {
      if (entry.expiresAt <= now) local.delete(entryKey);
    }
  }
  while (local.size > maxKeys) {
    const oldest = local.keys().next().value;
    if (oldest === undefined) break;
    local.delete(oldest);
  }
  return count;
}

export function rateLimit(group: string, limit: number, windowSeconds: number, identity?: (request: Request) => string, consume = consumeRate): RequestHandler {
  return async (request, response, next) => {
    try {
      const identifier = identity?.(request) || request.ip || "unknown";
      const key = `limit:${group}:${hash(identifier.toLowerCase())}`;
      const count = await consume(key, windowSeconds);
      response.setHeader("RateLimit-Limit", String(limit));
      if (count > limit) {
        response.setHeader("Retry-After", String(windowSeconds));
        return sendError(response, 429, "RATE_LIMITED", "Too many requests. Please try again later.");
      }
      return next();
    } catch (error) {
      console.error("Rate limit storage failed", error);
      return sendError(response, 503, "RATE_LIMIT_UNAVAILABLE", "Service temporarily unavailable");
    }
  };
}

const emailOrIp = (request: Request) =>
  typeof request.body?.email === "string" ? request.body.email.trim() : request.ip || "unknown";

export const generalLimit = rateLimit("general", 300, 300);
export const loginLimit = [rateLimit("login-ip", 20, 900), rateLimit("login-account", 10, 900, emailOrIp)];
export const registerLimit = rateLimit("register", 3, 3600);
export const resetLimit = [rateLimit("reset-ip", 10, 3600), rateLimit("reset-account", 3, 3600, emailOrIp)];
export const otpLimit = [rateLimit("otp-ip", 20, 900), rateLimit("otp-account", 5, 900, emailOrIp)];
export const verificationLimit = rateLimit("email-verification", 10, 900);
export const publicFormLimit = [rateLimit("privacy-public-ip", 3, 86400), rateLimit("privacy-public-contact", 3, 86400, (request) => `${request.body?.contactEmail ?? ""}:${request.body?.contactPhone ?? ""}`)];
