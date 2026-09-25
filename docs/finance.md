# Finance, Cancellation, and Reports

Stage 3 stores finance configuration and accounting records in PostgreSQL. Apply migrations before deploying the API. Agency administrators configure GST, commission, and cancellation tiers from **Finance & reports**.

## Booking amounts

Each booking stores a snapshot of the GST rate and amount, the agent commission rule and amount, and the final total. GST can be calculated before or after the booking discount. Percentage commission applies to the fare after discount; fixed commission applies per passenger seat. Later changes to agency settings do not recalculate existing bookings.

## Payments and cancellations

Payments are manually recorded as cash, bank transfer, card, UPI, or other. A booking can have multiple partial payments, but the sum cannot exceed its total. The API serializes payment updates per booking to prevent concurrent overpayment.

Cancellation tiers use hours before the trip departure and a fee percentage. The closest configured tier applies below its threshold. Agencies with no configured tiers cannot cancel bookings. Cancellation marks the booking cancelled and releases its booked seats in one transaction. A refund record can be posted in multiple parts, up to the lower of the amount paid and the cancellation refund eligibility.

## Commission, operator payable, and ledger

Commission and operator payable entries are created when a booking is confirmed. Cancellation posts proportional reversals. Posted payments, refunds, reversals, and settlements produce ledger entries; settlement entries reduce the party's available balance. Operator payable is assigned to the agency that owns the trip. Settlements are direct posted records and cannot exceed the available ledger balance.

## API routes

- `GET /api/finance/bookings/pnr/:pnr` — finance details, payments, refunds, and cancellation result for an accessible booking.
- `POST /api/bookings/:id/payments`, `POST /api/bookings/:id/cancel`, `POST /api/bookings/:id/refunds` — record collection, cancel/release seats, or record a manual refund.
- `GET/PUT /api/finance/settings` — read or update GST, commission, and cancellation tier settings. Super admins provide `agencyId` to manage a tenant.
- `POST /api/finance/settlements`, `GET /api/finance/ledger` — post a settlement or review ledger entries.
- `GET /api/finance/reports` — report data. Optional filters: `from`, `to`, `agencyId`, `branchId`, `agentId`, and `tripId`; the API intersects them with the caller's tenant scope.
- `GET /api/finance/reports/export/excel` and `/api/finance/reports/export/pdf` — download the same filtered booking report as Excel-compatible CSV or PDF.

Finance permissions are `finance:read`, `finance:payment`, `finance:refund`, `finance:cancel`, `finance:settlement`, and `finance:settings`. Tenant scoping is enforced by the API even when a caller supplies report filters.
