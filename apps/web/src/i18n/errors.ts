import { isLocale, translate, type Locale } from "./dictionaries";

const errorKeys: Record<string, string> = {
  FORBIDDEN: "You do not have permission to do this.",
  NOT_FOUND: "The requested item could not be found.",
  INVALID_REQUEST: "Please check the information and try again.",
  VALIDATION_ERROR: "Please check the information and try again.",
  CONFLICT: "This action conflicts with an existing record.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  RATE_LIMITED: "Too many attempts. Please try again later.",
};

export function getBrowserLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const value = document.cookie.split("; ").find((part) => part.startsWith("digol_locale="))?.split("=")[1];
  return isLocale(value) ? value : "en";
}

export function localizeApiError(code: string, message: string): string {
  const locale = getBrowserLocale();
  if (locale === "en") return message;
  const direct = translate(locale, message);
  if (direct !== message) return direct;
  return translate(locale, errorKeys[code] ?? "Something went wrong. Please try again.");
}

export function localizeText(message: string): string {
  return translate(getBrowserLocale(), message);
}
