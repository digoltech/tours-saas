import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/auth", destination: "/auth/login", permanent: false },
      ...["login", "register", "forgot-password", "verify-email", "onboarding"].map((page) => ({
        source: `/${page}`,
        destination: `/auth/${page}`,
        permanent: true,
      })),
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
    ] }];
  },
};
export default nextConfig;
