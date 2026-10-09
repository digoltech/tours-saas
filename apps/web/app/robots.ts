import type { MetadataRoute } from "next";
import { absoluteUrl, indexingEnabled } from "../src/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", ...(indexingEnabled ? {
      allow: "/",
      // Public account pages are crawlable so crawlers can see their noindex tags.
      // Operational records remain protected by authentication and excluded here.
      disallow: ["/api/", "/dashboard", "/agencies", "/agents", "/bookings", "/branches", "/buses", "/drivers", "/finance", "/profile", "/routes", "/seat-layout", "/settings", "/superadmin", "/trips", "/onboaridng"],
    } : { disallow: "/" }) },
    ...(indexingEnabled ? { sitemap: absoluteUrl("/sitemap.xml") } : {}),
  };
}
