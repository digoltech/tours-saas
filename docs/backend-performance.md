# API and database performance verification

Verified 9 October 2026 against the configured Postgres database and local API. No Redis or persistent response/authentication cache was added.

## Changes

- Restricted router middleware to relevant paths and authenticate only once within a request. Each new request still checks the database session, expiry, revocation, account status, agency and branch status. Standard permissions use the existing shared contract; custom permissions are read fresh from Postgres.
- Trip search now performs two grouped seat-count queries for the entire trip result set instead of two per trip. Expired holds are excluded.
- Customer grouping and pagination execute in Postgres. Latest bookings are fetched in one batch. Customer pages use three SQL statements, including the total count, independent of page size; no complete customer list is loaded into Node for pagination.
- Finance booking pages default to 20 rows, support server search/status filters, and cap page size at 100. Totals, branch summaries, occupancy and chart data are calculated separately in Postgres, so pagination never changes aggregate results. Charts retain the browser timezone. Existing Excel/PDF exports retain every matching booking.
- Removed unused report relations and parallelized the commission query. Occupancy capacity is summed in Postgres instead of loading all trips/buses/seat layouts.
- The frontend cancels superseded report requests, debounces PNR searches, loads policy settings only when opened, preserves policy drafts when switching tabs, reuses number formatters and avoids unnecessary JSON headers on GET requests.
- Applied migration `20261010010000_api_performance_indexes`: 16 indexes for tenant/branch/time/role filters, customer identities, notification pagination and substring PNR/passenger/route/trip searches using `pg_trgm`.
- Kept a shared bounded Postgres pool with explicit connection timeout and configurable pool size. Slow SQL logs report duration only, excluding SQL and parameters.

## Local measurements

Three serial browser requests per endpoint, using the same owner test session and seeded database. Times include HTTP and database round trips.

| Endpoint | Initial median | Final median |
| --- | ---: | ---: |
| Authentication /me | 290 ms | 62 ms |
| Booking dashboard summary | 382 ms | 112 ms |
| Trips list | 228 ms | 107 ms |
| Buses list | 143 ms | 92 ms |
| Customers list | 378 ms | 101 ms |
| Finance reports | 527 ms | 100 ms |
| Notifications | 527 ms | 78 ms |

Finance response size fell from approximately 9.4 KB to 5.1 KB on the seed data. Six concurrent report requests completed successfully, with a maximum of 676 ms.

These small-data lab samples demonstrate removed work, not production capacity or latency guarantees. Warm connections and network variability affect the timings. The upcoming-trip EXPLAIN ANALYZE execution took 0.079 ms on 21 rows; Postgres correctly chose a sequential scan for this tiny table. Relevant new indexes were confirmed valid. Production-scale plans and peak-load testing require representative data and hosting.

## Validation

- 59 tests passed, including batched seat counts, expired holds, tenant boundaries and booking concurrency.
- Live owner/branch-admin/employee API checks passed, including cross-branch denial, shared routes, finance and bulk/billing restrictions.
- Live database checks verified customer pagination (including an empty page), constant query count, report aggregate equality between one-row and full-data queries, and valid indexes.
- Browser API checks verified literal customer searches, report pagination, invariant totals/charts/branch summaries and complete CSV export.
- Web/API lint, TypeScript and production builds passed. Mobile finance search/filter/tab and layout checks passed.

## Repeatable checks

With the local API running and an authenticated `agent-browser` test session:

```powershell
./scripts/benchmark-api.ps1 -Session team-qa -Output api-benchmark.json
bun scripts/verify-performance.ts
bun scripts/verify-team-access.ts
```

`verify-performance.ts` reads the seeded owner account by default; set `PERF_EMAIL` for another test owner. Benchmark output contains timing/size metrics, not credentials. Pace repeated browser/API sweeps to respect the existing rate limit.

Pool settings: `DB_POOL_MAX` (default 10), `DB_CONNECTION_TIMEOUT_MS` (default 10000), and `DB_SLOW_QUERY_MS` (default 500). Size the total across API instances against the database connection budget. Long full exports still scale with the requested record count. The index migration must be applied to each deployment database; large production tables need an index-build deployment window or prebuilt concurrent indexes before migration.
