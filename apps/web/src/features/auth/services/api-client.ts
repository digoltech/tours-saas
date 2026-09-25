import type { AuthUser } from "../types";
import type { FinanceMethod, FinanceReportFilters, FinanceReportResponse, FinanceSettingsContract, SettlementParty } from "@a-one-tours/shared";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success)
    throw new Error(payload.success ? "Request failed" : payload.error.message);
  return payload.data;
}

export function login(email: string, password: string) {
  return request<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
export function register(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agencyName: string;
  branchName: string;
}) {
  return request<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function requestPasswordReset(email: string) {
  return request<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
export function verifyPasswordResetOtp(email: string, otp: string) {
  return request<{ verified: boolean }>("/api/auth/forgot-password/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}
export function resetPassword(email: string, otp: string, password: string) {
  return request<{ reset: boolean }>("/api/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify({ email, otp, password }),
  });
}
export function verifyEmail(token: string) {
  return request<{ verified: boolean }>(
    `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
  );
}
export function getInvitation(token: string) {
  return request<{
    email: string;
    firstName: string;
    lastName: string;
    agencyName: string;
  }>(`/api/auth/invitations/${encodeURIComponent(token)}`);
}
export function acceptInvitation(token: string, password: string) {
  return request<{ user: AuthUser }>("/api/auth/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}
export function completeOnboarding(data: {
  agencyName: string;
  branchName: string;
  phone?: string;
}) {
  return request<{ user: AuthUser }>("/api/auth/onboarding", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function getCurrentUser() {
  return request<AuthUser>("/api/auth/me");
}
export function logout() {
  return request<{ loggedOut: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export function getAgencies(search = "", status = "") {
  return request<unknown[]>(
    `/api/agencies?limit=100&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
  );
}

export function getDashboardSummary() {
  return request<{
    totalAgencies: number;
    activeAgencies: number;
    totalBranches: number;
    totalAgents: number;
    totalBuses: number;
    totalDrivers: number;
    totalRoutes: number;
    totalTrips: number;
  }>("/api/dashboard/summary");
}

export function createAgency(data: {
  name: string;
  slug: string;
  email?: string;
}) {
  return request<unknown>("/api/agencies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateAgency(id: string, data: Record<string, unknown>) {
  return request<unknown>(`/api/agencies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deactivateAgency(id: string) {
  return request<unknown>(`/api/agencies/${id}`, { method: "DELETE" });
}

export function getBranches(agencyId: string, search = "", status = "") {
  return request<unknown[]>(
    `/api/agencies/${agencyId}/branches?limit=100&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
  );
}

export function createBranch(
  agencyId: string,
  data: { name: string; code: string; email?: string },
) {
  return request<unknown>(`/api/agencies/${agencyId}/branches`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateBranch(id: string, data: Record<string, unknown>) {
  return request<unknown>(`/api/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deactivateBranch(id: string) {
  return request<unknown>(`/api/branches/${id}`, { method: "DELETE" });
}

export function getAgents(agencyId: string, search = "", status = "") {
  return request<unknown[]>(
    `/api/agencies/${agencyId}/agents?limit=100&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
  );
}

export function createAgent(
  agencyId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
  },
) {
  return request<unknown>(`/api/agencies/${agencyId}/agents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateAgent(id: string, data: Record<string, unknown>) {
  return request<unknown>(`/api/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deactivateAgent(id: string) {
  return request<unknown>(`/api/agents/${id}`, { method: "DELETE" });
}

export type PageResult<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
export type Branch = {
  id: string;
  name: string;
  code: string;
  agencyId?: string;
};
export type Bus = {
  id: string;
  busNumber: string;
  registrationNumber: string;
  operatorName?: string | null;
  busType: string;
  totalSeats: number;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  description?: string | null;
  amenities?: string[];
  photos?: string[];
  status: string;
  branch: Branch;
};
export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  licenseNumber: string;
  licenseExpiryDate?: string | null;
  status: string;
  branch: Branch;
};
export type Route = {
  id: string;
  name: string;
  code: string;
  source: string;
  destination: string;
  description?: string | null;
  status: string;
  _count?: { stops: number };
};
export type Stop = {
  id: string;
  name: string;
  city?: string | null;
  sequence: number;
  status: string;
  points: { pointType: string; status: string }[];
};
export type Trip = {
  id: string;
  tripCode: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  fare: number | string;
  route: Route;
  bus: Bus;
  driver: Driver;
  branch: Branch;
};

export type BookingTrip = Trip & { availableSeats: number };
export type SeatAvailability = {
  trip: Trip & { route: Route & { stops: Stop[] }; bus: Bus };
  rows: number;
  columns: number;
  seats: { name: string; type: string; restriction: string; status: string; holdExpiresAt: string | null }[];
  discountCap: { type: "FIXED" | "PERCENTAGE"; value: number };
};
export type BookingPassengerInput = {
  seatName: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  documentType?: string;
  documentReference?: string;
};
export function searchBookingTrips(params: {
  source: string;
  destination: string;
  date: string;
}) {
  return request<BookingTrip[]>(
    `/api/bookings/search?${transportQuery(params)}`,
  );
}
export function getSeatAvailability(tripId: string) {
  return request<SeatAvailability>(`/api/bookings/trips/${tripId}/seats`);
}
export function createSeatHold(
  tripId: string,
  seats: string[],
  holdToken?: string,
) {
  return request<{ holdToken: string; expiresAt: string }>(
    "/api/bookings/holds",
    { method: "POST", body: JSON.stringify({ tripId, seats, holdToken }) },
  );
}
export function releaseSeatHold(token: string) {
  return request<{ released: boolean }>(`/api/bookings/holds/${token}`, {
    method: "DELETE",
  });
}
export function confirmBooking(data: {
  tripId: string;
  holdToken: string;
  idempotencyKey: string;
  boardingStopId: string;
  dropOffStopId: string;
  discountType?: "FIXED" | "PERCENTAGE";
  discountValue?: number;
  passengers: BookingPassengerInput[];
}) {
  return request<BookingRecord>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function getBookingByPnr(pnr: string) {
  return request<BookingRecord>(`/api/bookings/pnr/${encodeURIComponent(pnr)}`);
}
export function getBookings(params: Record<string, string | undefined> = {}) {
  return request<PageResult<BookingRecord>>(
    `/api/bookings?${transportQuery({ limit: "20", ...params })}`,
  );
}
export function getBookingDashboardSummary() {
  return request<{
    todayBookings: number;
    todaySales: number;
    upcomingTrips: number;
  }>("/api/bookings/summary");
}
export type FinanceSettingsData = Omit<FinanceSettingsContract, "agencyId">;
export function getFinanceSettings(agencyId?: string) { return request<{ settings: Omit<FinanceSettingsContract, "tiers"> | null; tiers: FinanceSettingsContract["tiers"] }>(`/api/finance/settings${agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : ""}`); }
export function saveFinanceSettings(data: Omit<FinanceSettingsContract, "gstRate" | "commissionValue" | "tiers"> & { gstRate: number; commissionValue: number; tiers: { hoursBeforeDeparture: number; feePercent: number }[] }) { return request<FinanceSettingsData>("/api/finance/settings", { method: "PUT", body: JSON.stringify(data) }); }
export type FinanceFilters = FinanceReportFilters;
function financeQuery(filters: FinanceFilters = {}) { const query = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value); return query; }
export function getFinanceReports(from?: string, to?: string, scope: Omit<FinanceFilters, "from" | "to"> = {}) { const query = financeQuery({ ...scope, from, to }); return request<FinanceReportResponse & { ledger: Record<string, unknown>[] }>(`/api/finance/reports?${query}`); }
export function getFinanceLedger() { return request<Record<string, unknown>[]>("/api/finance/ledger"); }
export function getBookingFinanceByPnr(pnr: string) { return request<{ id: string; pnr: string; status: string; totalAmount: number | string; taxAmount: number | string; payments: { id: string; amount: number | string; method: string; reference: string | null; receivedAt: string }[]; refunds: { id: string; amount: number | string; method: string; reference: string | null; refundedAt: string }[]; cancellation: { eligibleRefund: number | string; feeAmount: number | string } | null }>(`/api/finance/bookings/pnr/${encodeURIComponent(pnr)}`); }
export function recordBookingPayment(id: string, data: { amount: number; method: FinanceMethod; reference?: string }) { return request<unknown>(`/api/bookings/${id}/payments`, { method: "POST", body: JSON.stringify(data) }); }
export function cancelBookingFinance(id: string, reason?: string) { return request<{ eligibleRefund: number; feeAmount: number; feePercent: number }>(`/api/bookings/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }); }
export function recordBookingRefund(id: string, data: { amount: number; method: FinanceMethod; reference?: string }) { return request<unknown>(`/api/bookings/${id}/refunds`, { method: "POST", body: JSON.stringify(data) }); }
export function postFinanceSettlement(data: { party: SettlementParty; partyId: string; amount: number; method: FinanceMethod; reference?: string }) { return request<unknown>("/api/finance/settlements", { method: "POST", body: JSON.stringify(data) }); }
export function financeExportUrl(format: "excel" | "pdf", from?: string, to?: string, scope: Omit<FinanceFilters, "from" | "to"> = {}) { const query = financeQuery({ ...scope, from, to }); return `${apiUrl}/api/finance/reports/export/${format}?${query}`; }
export type BookingRecord = {
  id: string;
  pnr: string;
  currency: string;
  baseFare: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  passengers: BookingPassengerInput[];
  trip: Trip & { route: Route; bus: Bus };
  boardingStop: { id: string; name: string };
  dropOffStop: { id: string; name: string };
};
export function getSeatLayout(busId: string) {
  return request<{ rows: number; columns: number; disabledSeats: string[]; seatDetails?: Record<string, {type:string;restriction:string}> }>(
    `/api/buses/${busId}/seat-layout`,
  );
}
export function saveSeatLayout(
  busId: string,
  data: { rows: number; columns: number; disabledSeats: string[]; seatDetails: Record<string, {type:string;restriction:string}> },
) {
  return request<{ rows: number; columns: number; disabledSeats: string[]; seatDetails?: Record<string, {type:string;restriction:string}> }>(
    `/api/buses/${busId}/seat-layout`,
    { method: "PUT", body: JSON.stringify(data) },
  );
}
export function getDiscountCap() {
  return request<{ type: "FIXED" | "PERCENTAGE"; value: number }>(
    "/api/bookings/discount-cap",
  );
}
export function updateDiscountCap(data: {
  type: "FIXED" | "PERCENTAGE";
  value: number;
}) {
  return request<{ type: "FIXED" | "PERCENTAGE"; value: number }>(
    "/api/bookings/discount-cap",
    { method: "PUT", body: JSON.stringify(data) },
  );
}
const transportQuery = (params: Record<string, string | undefined>) =>
  Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value!)}`)
    .join("&");
export function getBuses(params: Record<string, string | undefined> = {}) {
  return request<PageResult<Bus>>(
    `/api/buses?${transportQuery({ limit: "20", ...params })}`,
  );
}
export function getBusById(id: string) {
  return request<Bus>(`/api/buses/${id}`);
}
export function createBus(data: Record<string, unknown>) {
  return request<Bus>("/api/buses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateBus(id: string, data: Record<string, unknown>) {
  return request<Bus>(`/api/buses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deactivateBusById(id: string) {
  return request<Bus>(`/api/buses/${id}`, { method: "DELETE" });
}
export function getDrivers(params: Record<string, string | undefined> = {}) {
  return request<PageResult<Driver>>(
    `/api/drivers?${transportQuery({ limit: "20", ...params })}`,
  );
}
export function createDriver(data: Record<string, unknown>) {
  return request<Driver>("/api/drivers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateDriver(id: string, data: Record<string, unknown>) {
  return request<Driver>(`/api/drivers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deactivateDriverById(id: string) {
  return request<Driver>(`/api/drivers/${id}`, { method: "DELETE" });
}
export function getRoutes(params: Record<string, string | undefined> = {}) {
  return request<PageResult<Route>>(
    `/api/routes?${transportQuery({ limit: "20", ...params })}`,
  );
}
export function getRoute(id: string) {
  return request<Route & { stops: Stop[] }>(`/api/routes/${id}`);
}
export function createRoute(data: Record<string, unknown>) {
  return request<Route>("/api/routes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateRoute(id: string, data: Record<string, unknown>) {
  return request<Route>(`/api/routes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deactivateRouteById(id: string) {
  return request<Route>(`/api/routes/${id}`, { method: "DELETE" });
}
export function getStops(routeId: string) {
  return request<Stop[]>(`/api/routes/${routeId}/stops`);
}
export function createStop(routeId: string, data: Record<string, unknown>) {
  return request<Stop>(`/api/routes/${routeId}/stops`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateStop(id: string, data: Record<string, unknown>) {
  return request<Stop>(`/api/stops/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deactivateStop(id: string) {
  return request<Stop>(`/api/stops/${id}`, { method: "DELETE" });
}
export function configurePoint(stopId: string, data: Record<string, unknown>) {
  return request<unknown>(`/api/stops/${stopId}/point`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
export function getTrips(params: Record<string, string | undefined> = {}) {
  return request<PageResult<Trip>>(
    `/api/trips?${transportQuery({ limit: "20", ...params })}`,
  );
}
export function getTrip(id: string) {
  return request<Trip & { route: Route & { stops: Stop[] } }>(
    `/api/trips/${id}`,
  );
}
export function createTrip(data: Record<string, unknown>) {
  return request<Trip>("/api/trips", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateTrip(id: string, data: Record<string, unknown>) {
  return request<Trip>(`/api/trips/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function cancelTrip(id: string) {
  return request<Trip>(`/api/trips/${id}`, { method: "DELETE" });
}
