import type { Request, Response } from "express";
import { environment } from "../config/env.js";

export const AUTH_COOKIE = "aone_session";

export function readCookie(request: Request, name: string) {
  const header = request.headers.cookie;
  if (!header) return undefined;
  const value = header
    .split(";")
    .find((part) => part.trim().startsWith(`${name}=`));
  if (!value) return undefined;
  try { return decodeURIComponent(value.trim().slice(name.length + 1)); }
  catch { return undefined; }
}

function cookieAttributes(production: boolean) {
  return `Path=/; HttpOnly; SameSite=Lax${production ? "; Secure" : ""}`;
}

export function authCookieValue(token: string, role: string, production: boolean) {
  return `${AUTH_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(production)}; Max-Age=${role === "SUPER_ADMIN" ? 28800 : 86400}`;
}

export function setAuthCookie(response: Response, token: string, role: string) {
  response.setHeader(
    "Set-Cookie",
    authCookieValue(token, role, environment.NODE_ENV === "production"),
  );
}

export function clearAuthCookie(response: Response) {
  response.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=; ${cookieAttributes(environment.NODE_ENV === "production")}; Max-Age=0`,
  );
}
