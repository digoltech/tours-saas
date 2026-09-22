import type { Request, Response } from "express";

export const AUTH_COOKIE = "aone_session";

export function readCookie(request: Request, name: string) {
  const header = request.headers.cookie;
  if (!header) return undefined;
  const value = header
    .split(";")
    .find((part) => part.trim().startsWith(`${name}=`));
  return value
    ? decodeURIComponent(value.trim().slice(name.length + 1))
    : undefined;
}

export function setAuthCookie(response: Response, token: string) {
  response.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );
}

export function clearAuthCookie(response: Response) {
  response.setHeader(
    "Set-Cookie",
    `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}
