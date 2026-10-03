import "server-only";

import { cookies } from "next/headers";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

export async function serverApiRequest<T>(path: string): Promise<T> {
  const token = (await cookies()).get("aone_session")?.value;
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(
    `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000"}${path}`,
    {
      headers: { Cookie: `aone_session=${token}` },
      cache: "no-store",
    },
  );

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok || !payload.success)
    throw new Error(
      payload.success ? "Unable to load platform data." : payload.error.message,
    );

  return payload.data;
}
