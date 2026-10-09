import assert from "node:assert/strict";
import { featurePages, guidePages } from "../apps/web/src/features/marketing/content";

// Run from the repository root: bun scripts/check-seo.ts [http://localhost:3000]
const base = process.argv[2] || "http://localhost:3000";
const paths = ["/", "/features", "/guides", "/contact", "/privacy-policy", "/terms-and-conditions", ...featurePages.map(p => `/features/${p.slug}`), ...guidePages.map(p => `/guides/${p.slug}`)];
const titles = new Set<string>();
const descriptions = new Set<string>();
let checks = 0;
function check(condition: unknown, message: string) { assert.ok(condition, message); checks++; }
function attributes(tag: string) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(m => [m[1], m[2]]));
}
const options = { headers: { "User-Agent": "Googlebot" } };
for (const path of paths) {
  const response = await fetch(`${base}${path}`, options);
  check(response.status === 200, `${path}: HTTP 200`);
  const html = await response.text();
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  check(title && !titles.has(title), `${path}: unique title`);
  check(title?.includes("| Digol TravelOS"), `${path}: branded title`);
  titles.add(title!);
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attributes(m[0]));
  const description = metas.find(m => m.name === "description")?.content;
  check(description && !descriptions.has(description), `${path}: unique description`);
  descriptions.add(description!);
  check((html.match(/<h1\b/g) || []).length === 1, `${path}: one H1`);
  const canonicals = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attributes(m[0])).filter(m => m.rel === "canonical");
  check(canonicals.length === 1 && new URL(canonicals[0].href).pathname === path, `${path}: canonical path`);
  check(metas.some(m => m.property === "og:title") && metas.some(m => m.property === "og:image"), `${path}: social metadata`);
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  if (path === "/" || path.startsWith("/features") || path.startsWith("/guides")) {
    check(scripts.length > 0, `${path}: structured data present`);
    for (const script of scripts) {
      const parsed = JSON.parse(script[1]);
      const entities = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
      for (const entity of entities) {
        if (entity["@type"] === "FAQPage") {
          for (const question of entity.mainEntity) check(html.includes(question.name), `${path}: FAQ question is visible`);
        }
        check(!entity.aggregateRating && !entity.review && !entity.offers, `${path}: no invented commercial claims`);
      }
    }
  }
}
for (const path of ["/auth/login", "/auth/register", "/privacy/request", "/dashboard/home", "/bookings", "/newsletter/confirm"]) {
  const response = await fetch(`${base}${path}`, { ...options, redirect: "manual" });
  check(response.headers.get("x-robots-tag")?.includes("noindex"), `${path}: X-Robots-Tag noindex`);
}
for (const path of ["/features/not-a-feature", "/guides/not-a-guide"]) {
  check((await fetch(`${base}${path}`, options)).status === 404, `${path}: real 404`);
}
const image = await fetch(`${base}/opengraph-image`);
check(image.ok && image.headers.get("content-type")?.includes("image/png"), "Social preview is a PNG");
const robots = await (await fetch(`${base}/robots.txt`)).text();
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
check(!sitemap.includes("/dashboard") && !sitemap.includes("/auth/"), "Sitemap excludes private and account routes");
check(robots.includes("User-Agent: *"), "Robots has a general crawler policy");

// Verify both deployment branches without assigning a fabricated production domain.
for (const enabled of [true, false]) {
  const code = `import assert from 'node:assert/strict';
    import { indexingEnabled, publicMetadata } from './apps/web/src/lib/seo.ts';
    import robots from './apps/web/app/robots.ts';
    import sitemap from './apps/web/app/sitemap.ts';
    assert.equal(indexingEnabled, ${enabled});
    assert.equal(publicMetadata({title:'Test',description:'Test',path:'/features'}).robots.index, ${enabled});
    const entries = sitemap();
    assert.equal(entries.length, ${enabled ? paths.length : 0});
    assert.ok(entries.every(e => e.url.startsWith('https://seo-test.example/')));
    assert.equal(Boolean(robots().sitemap), ${enabled});
    if (${enabled}) { assert.equal(robots().rules.allow, '/'); assert.ok(!robots().rules.disallow.includes('/auth')); }
    else { assert.equal(robots().rules.disallow, '/'); }
  `;
  const child = Bun.spawn([process.execPath, "-e", code], { cwd: process.cwd(), env: { ...process.env, NEXT_PUBLIC_SITE_URL: "https://seo-test.example", SEO_INDEXABLE: String(enabled) }, stdout: "pipe", stderr: "pipe" });
  const status = await child.exited;
  check(status === 0, `Deployment policy (${enabled}): ${await new Response(child.stderr).text()}`);
}
console.log(`SEO checks passed: ${checks}; ${paths.length} public pages, deployment policies, private headers and unknown-page 404s.`);
