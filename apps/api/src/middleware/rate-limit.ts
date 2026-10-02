import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { createClient } from "redis";
import { environment } from "../config/env.js";
import { sendError } from "../utils/api-response.js";

const redis = environment.REDIS_URL ? createClient({ url: environment.REDIS_URL, socket: { reconnectStrategy: false, connectTimeout: 2000 } }) : null;
redis?.on("error", (error) => console.error("Rate limit Redis error", error));
let connecting: Promise<unknown> | null = null;
const local = new Map<string, { count: number; expiresAt: number }>();
const script = "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count";

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function consumeRate(key: string, windowSeconds: number): Promise<number> {
  if (!redis) {
    if (environment.NODE_ENV === "production") throw new Error("Rate limit storage is unavailable");
    const now = Date.now();
    const current = local.get(key);
    const count = current && current.expiresAt > now ? current.count + 1 : 1;
    local.set(key, { count, expiresAt: current && current.expiresAt > now ? current.expiresAt : now + windowSeconds * 1000 });
    return count;
  }
  if (!redis.isOpen) {
    connecting ??= redis.connect().finally(() => { connecting = null; });
    await connecting;
  }
  return Number(await redis.eval(script, { keys: [key], arguments: [String(windowSeconds)] }));
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
