import type { MetadataRoute } from "next";
import { absoluteUrl, indexingEnabled } from "../src/lib/seo";
import { featurePages, guidePages } from "../src/features/marketing/content";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingEnabled) return [];
  const paths = ["/", "/features", "/guides", "/contact", "/privacy-policy", "/terms-and-conditions",
    ...featurePages.map((page) => `/features/${page.slug}`),
    ...guidePages.map((page) => `/guides/${page.slug}`)];
  // Do not fabricate lastModified dates on every crawl/build.
  return paths.map((path) => ({ url: absoluteUrl(path) }));
}
