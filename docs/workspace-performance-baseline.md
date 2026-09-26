# Workspace performance baseline

Captured on 2026-09-26 from the local production build (`bun run build:web`).

| Measure | Before | After first SSR slice |
| --- | ---: | ---: |
| Total raw files under `.next/static/chunks` | 1,682,658 bytes | 1,671,223 bytes |
| Dashboard route rendering | Static client shell | Dynamic server rendering |
| Dashboard summary and upcoming trips | Browser fetch after hydration | Server fetch before render |

The chunk total is an aggregate across the application, not a per-route or compressed transfer size. Its 11,435-byte decrease is a small reduction; the main expected gain is showing dashboard and trip list data before client hydration.

Authenticated response times, browser LCP/INP, and database query timings were not measured here because those require a running API, a reachable Supabase database, and a representative signed-in account. The API now logs request duration and warns at 1,000 ms or more. Capture those runtime measures against the same deployment, account role, and dataset before choosing further database or bundling work.
