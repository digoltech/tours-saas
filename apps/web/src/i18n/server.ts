import "server-only";
import { cookies } from "next/headers";
import { isLocale, type Locale } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("digol_locale")?.value;
  return isLocale(value) ? value : "en";
}
