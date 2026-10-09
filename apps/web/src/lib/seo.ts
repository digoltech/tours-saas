import type { Metadata } from "next";

export const siteName = "Digol TravelOS";
export const siteDescription =
  "Bus booking and travel agency management software for trips, seat reservations, fleet, branch teams, payments, refunds and reports.";

function configuredOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = new URL(value || "http://localhost:3000");
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query or credentials");
  }
  return url;
}
export const siteOrigin = configuredOrigin();
// Preview builds must not advertise localhost URLs to search engines.
export const indexingEnabled = Boolean(process.env.NEXT_PUBLIC_SITE_URL) &&
  siteOrigin.protocol === "https:" &&
  !["localhost", "127.0.0.1", "[::1]"].includes(siteOrigin.hostname) &&
  process.env.SEO_INDEXABLE !== "false";

export function absoluteUrl(path: string) {
  return new URL(path, siteOrigin).toString();
}

export function publicMetadata({ title, description, path }: {
  title: string; description: string; path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: {
      index: indexingEnabled, follow: true,
      googleBot: { index: indexingEnabled, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      type: "website", siteName, title: `${title} | ${siteName}`, description,
      url: absoluteUrl(path), locale: "en_IN",
      images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: "Digol TravelOS — bus booking and travel agency management software" }],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${siteName}`, description, images: [absoluteUrl("/opengraph-image")] },
  };
}

export const privateMetadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const productGraph = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": absoluteUrl("/#organization"), name: "Digol Tours", url: absoluteUrl("/"), logo: absoluteUrl("/digol-mark.svg") },
    { "@type": "WebSite", "@id": absoluteUrl("/#website"), name: siteName, url: absoluteUrl("/"), inLanguage: "en", publisher: { "@id": absoluteUrl("/#organization") } },
    {
      "@type": "SoftwareApplication", "@id": absoluteUrl("/#software"), name: siteName,
      url: absoluteUrl("/"), applicationCategory: "BusinessApplication", operatingSystem: "Web browser",
      description: siteDescription, publisher: { "@id": absoluteUrl("/#organization") },
      featureList: ["Trip scheduling", "Bus seat reservations", "Passenger details and PNR lookup", "Branch-based team permissions", "Fleet and route management", "Manual payment recording", "Refunds, commissions and financial reports"],
    },
  ],
};
