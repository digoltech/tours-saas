import "server-only";

import { headers } from "next/headers";
import type { AuthUser } from "./types";

const userHeader = "x-aone-auth-user";

export async function getRequestUser(): Promise<AuthUser | null> {
  const value = (await headers()).get(userHeader);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}
