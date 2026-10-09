# Digol TravelOS: search and answer visibility

Implemented and reviewed October 9, 2026.

## What changed

The public homepage now states the product category, explains supported capabilities, links to substantive feature pages and guides, and includes visible answers to common questions. Public feature and guide content is rendered on the server, uses semantic headings, includes related links, and does not require a login to read. New pages have unique titles/descriptions, self-referencing canonicals, Open Graph/Twitter metadata and a locally generated 1200×630 social image.

Structured data describes the actual Organization, WebSite and SoftwareApplication, plus page breadcrumbs and FAQs that match visible answers. No reviews, ratings, customer counts, prices or payment integrations were invented. SoftwareApplication markup does not imply eligibility for a Google software-app rich result; that feature has additional requirements. FAQ markup does not guarantee a search enhancement either.

Public navigation and the footer link to Features and Guides. The homepage category copy and shared navigation have Hindi/Gujarati translations. The reference articles are currently English and explicitly marked `lang="en"`. There are no invented locale URLs or hreflang declarations; dedicated translated public URLs should be added only when corresponding content exists.

## Keyword and intent map

These are category/intention targets grounded in the software, not claims about measured search volume or keyword difficulty.

| Page | Main intent | Supporting topics |
| --- | --- | --- |
| `/` | Bus booking and travel agency management software | Agency operations, seats, branches, financial records |
| `/features/bus-booking-software` | Bus booking software for agencies | Seat reservation, PNR search, passenger details, manual payments |
| `/features/travel-agency-management-software` | Travel agency management software | Multiple branches, agency owner, branch admin, employees |
| `/features/bus-fleet-management-software` | Bus fleet management software | Operators, buses, routes, seat layouts, trips |
| `/guides/bus-booking-workflow` | How to manage a bus ticket booking workflow | Trip selection, seats, passenger validation, payment entry |
| `/guides/branch-team-permissions` | How to assign agency and branch team permissions | Owner access, branch employees, advanced custom roles |

The feature pages answer commercial evaluation questions. The guides answer practical operational questions, and link back to the relevant product pages. Fleet content states its limits and does not advertise GPS/telematics. Booking content states that current payment entry records manually collected payments.

## Activate indexing on the real deployment

1. Set `NEXT_PUBLIC_SITE_URL` to the actual HTTPS public origin, without a path, query or credentials. Example syntax: `https://<your-live-domain>`. Do not use the API URL. The real domain has not yet been supplied in this session.
2. Set `SEO_INDEXABLE=true` for production; use `false` for previews/staging. Rebuild and restart the frontend after changing these values. With no configured HTTPS public origin, this implementation intentionally returns noindex metadata, disallows crawling and emits an empty sitemap to avoid advertising localhost.
3. Add the domain in Google Search Console and Bing Webmaster Tools. Set the provided `GOOGLE_SITE_VERIFICATION` and/or `BING_SITE_VERIFICATION` tokens before rebuilding if using their HTML verification method. DNS verification is another owner-controlled option.
4. Inspect the deployed homepage and representative feature/guide URLs. Confirm HTTPS, HTTP 200, canonical host, indexable metadata, visible HTML, and public `/robots.txt` and `/sitemap.xml`. Submit the sitemap URL in the webmaster tools. Submitting a sitemap is discovery guidance, not guaranteed indexing.
5. Redirect other hostname/protocol variants permanently to the chosen canonical host in the hosting/reverse-proxy configuration. DNS/TLS/live hosting were not modified in this task.

The sitemap contains only public marketing/contact/legal pages. Dashboard, operational aliases, authentication, newsletter-account actions and privacy-request pages carry noindex controls. Operational pages remain protected by existing authentication. Robots exclusions alone are not access control, and disallow alone does not reliably remove an indexed URL. Account pages stay crawlable on production so their noindex directives can be read.

The detailed `/privacy` notice remains controlled by the existing legal approval configuration; this task does not publish an unapproved notice. Verify published contact and legal content before launch.

## AEO / GEO approach

Useful, accessible, specific text and conventional SEO are the foundation for visibility in search and AI answers. The new reference pages begin with direct definitions, explain real workflows, show role/step tables, and answer relevant questions. Google states that no additional AI-specific schema or special files are required for its AI search features; its guidance explicitly says Google ignores `llms.txt`. No speculative AI-ranking file was added.

Production public routes allow general search crawling. OAI-SearchBot can therefore access the public content under the general rule. OpenAI documents separate controls for its search crawler and GPTBot training crawler; an owner can choose a separate training policy without blocking search. Preview builds remain blocked. Neither crawling permission nor markup guarantees an AI citation.

## Next work requiring real business inputs

- Confirm the live domain, primary market and ideal customer segment before adding location-specific copy. Do not create near-identical city pages.
- Publish original, permissioned customer case studies with actual workflows, outcomes and named authors. Add ratings/reviews only when genuine and verifiable.
- Confirm packages and prices before adding a pricing page or commercial offers in structured data.
- Keep feature screenshots and documentation current. Expand guides around real support questions, with clear ownership and meaningful editorial updates.
- Earn relevant mentions from actual partners, customers and industry publications. External account creation, messages and submissions were not performed.
- Use Search Console/Bing data to track impressions, clicks, queries and indexed pages after deployment. Track qualified registrations/contact leads, rather than treating keyword position alone as success. Use field Core Web Vitals when traffic permits; synthetic checks are only a diagnostic input.

## Verification

Run a production frontend, then execute from the repository root:

```powershell
bun scripts/check-seo.ts http://localhost:3000
bun run lint:web
bun run build:web
bun run i18n:check
```

The SEO checker covers 11 public pages: status, unique title/description, one H1, canonical paths, social metadata, parseable structured data and visible FAQ questions. It also verifies private noindex headers, unknown-content 404s, social-image delivery, sitemap exclusions and both production/preview configuration branches. The reserved `seo-test.example` origin is used only in isolated configuration tests and is not a deployment setting.

Final validation passed: 133 SEO assertions across 11 public pages; frontend lint and production build (including TypeScript); translation catalog checks; 16 browser layout combinations at 320, 390, 768 and 1440 pixels. The corrected mobile header was rechecked in the final production build, with no horizontal overflow or browser errors. Hindi and Gujarati mobile headers were also checked.

A manual HTML/browser audit was used because the squirrelscan CLI was unavailable. No fabricated audit score, search volume, ranking improvement or live indexing result is reported.

## Primary references

- [Google: AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: building a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: blocking indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google: software application structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [OpenAI: crawler controls](https://developers.openai.com/api/docs/bots)
