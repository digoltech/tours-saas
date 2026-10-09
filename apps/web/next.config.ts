import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/auth", destination: "/auth/login", permanent: false },
      ...["login", "register", "forgot-password", "verify-email"].map((page) => ({
        source: `/${page}`,
        destination: `/auth/${page}`,
        permanent: true,
      })),
      { source: "/onboarding", destination: "/onboaridng/", permanent: true },
      { source: "/invite/:token", destination: "/auth/invite/:token", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
    ] }, ...["dashboard", "auth", "newsletter", "onboaridng", "api", "agencies", "agents", "bookings", "branches", "buses", "drivers", "finance", "profile", "routes", "seat-layout", "settings", "superadmin", "trips"].map((path) => ({
      source: `/${path}/:path*`,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    })), { source: "/privacy/request", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};
export default nextConfig;
