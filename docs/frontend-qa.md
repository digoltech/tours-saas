# Frontend responsiveness and performance verification

Verified on 9 October 2026 against the local production Next.js build in Chrome.

## Coverage

252 viewport checks across 63 distinct screens at 320, 390, 768, and 1440 pixels wide passed without document-level horizontal overflow, unexpected redirects, or visible alert errors. Coverage included public/authentication pages; owner, branch-admin, employee, and platform dashboards; booking, fleet, team, branches, customers, routes, roles, activity, finance, settings, privacy and bulk-data pages; and available record/detail/edit screens. Empty record families without seeded records were not exercised as populated detail pages.

Additional interaction checks covered the mobile navigation drawer, search results, profile dropdown, bus selection, an eight-column seat map, and switching English/Hindi/Gujarati back to English. Seat-map scrolling remains inside its keyboard-focusable region. Test changes to the seat map were not saved.

## Changes

- Removed the body minimum width that caused overflow on 320px screens with a vertical scrollbar.
- Constrained mobile search/profile dropdowns and seat-layout controls; wrapped legends and kept wide seat maps inside their panel.
- Replaced external Google Fonts CSS with self-hosted Next.js fonts. Preloaded the main body and heading fonts; other scripts and monospace fonts load when needed. Browser checks found no runtime Google Fonts requests.
- Rendered homepage translations on the server, reducing client translation components.
- Avoided unnecessary background route prefetches in sidebar, dashboard actions and record lists.
- Stabilized authentication context and translation callbacks, cached number formatters, and lazily initialized seat layouts.
- Added lazy/async image handling and prevented stale finance responses from replacing newer filter results.

## Performance result

An isolated mobile Lighthouse run on the production homepage scored **93/100**:

| Metric | Result |
| --- | --- |
| First Contentful Paint | 1.4 seconds |
| Largest Contentful Paint | 3.1 seconds |
| Total Blocking Time | 40 milliseconds |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.4 seconds |

These are local lab measurements, not a site-wide field score. LCP remains above the 2.5-second good threshold; production hosting, devices and actual data can change results. React Doctor reported five fewer performance warnings; broader component complexity warnings remain.

## Validation

- Web/API lint and production builds passed, including TypeScript compilation.
- API tests: 58 passed, zero failed.
- CSS class check: zero missing named classes.
- Translation check: all 1,235 catalog strings translated in Hindi and Gujarati.
- Git whitespace check passed.

## Repeatable layout check

Use PowerShell 7.3 or later with `agent-browser`, the web server on port 3000, and API on port 4000. Authenticate the browser session before protected checks.

```powershell
./scripts/check-responsive.ps1 -PublicOnly -Session public-qa -Output public-layout.json
./scripts/check-responsive.ps1 -Session owner-qa -Paths /dashboard/home,/dashboard/finance -Output dashboard-layout.json
```

The default protected scan also discovers available record links. Run authenticated scans in paced batches: aggressive parallel reloads can exceed the API rate limit. The script rejects authentication redirects so a login screen cannot count as a passing protected route. Overflow inside intentionally scrollable tables, tabs and seat maps is allowed; document overflow is not.
