import type { AuthUser } from "../types";
import { localizeApiError } from "../../../i18n/errors";
import type {
  FinanceMethod,
  FinanceReportFilters,
  FinanceReportResponse,
  FinanceSettingsContract,
  SettlementParty,
} from "@a-one-tours/shared";
import type {
  AgencyBranding,
  NotificationPreferences,
  SubscriptionContract,
} from "@a-one-tours/shared";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

export type PrivacyRequestRecord = {
  id: string; type: "ACCESS" | "ERASURE"; status: "PENDING" | "VERIFIED" | "COMPLETED" | "RETAINED" | "REJECTED";
  subjectName: string; contactEmail: string | null; contactPhone: string | null; bookingPnr: string | null;
  reason: string | null; reviewNote: string | null; agencyId: string | null; userId: string | null;
  createdAt: string; verifiedAt: string | null; completedAt: string | null;
};

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
    throw new Error(payload.success ? localizeApiError("UNKNOWN", "Request failed") : localizeApiError(payload.error.code, payload.error.message));
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
  confirmPassword: string;
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
  return request<{ verified: boolean; emailChanged: boolean }>(
    "/api/auth/verify-email",
    { method: "POST", body: JSON.stringify({ token }) },
  );
}

export function resendEmailVerification() {
  return request<{ sent: boolean }>("/api/auth/verify-email/resend", { method: "POST" });
}
export function subscribeNewsletter(email: string) {
  return request<{ sent: boolean }>("/api/newsletter/subscribe", { method: "POST", body: JSON.stringify({ email }) });
}
export function confirmNewsletter(token: string) {
  return request<{ confirmed: boolean }>("/api/newsletter/confirm", { method: "POST", body: JSON.stringify({ token }) });
}
export function unsubscribeNewsletter(token: string) {
  return request<{ unsubscribed: boolean }>("/api/newsletter/unsubscribe", { method: "POST", body: JSON.stringify({ token }) });
}
export function sendContactInquiry(input: { name: string; email: string; subject: string; message: string }) {
  return request<{ received: boolean }>("/api/contact", { method: "POST", body: JSON.stringify(input) });
}

export function submitPublicPrivacyRequest(input: { type: "ACCESS" | "ERASURE"; subjectName: string; contactEmail?: string; contactPhone?: string; bookingPnr: string; reason?: string }) {
  return request<{ id: string }>("/api/privacy/public-requests", { method: "POST", body: JSON.stringify(input) });
}
export function submitStaffPrivacyRequest(input: { type: "ACCESS" | "ERASURE"; reason?: string }) {
  return request<{ id: string; status: string }>("/api/privacy/requests", { method: "POST", body: JSON.stringify(input) });
}
export function getPrivacyRequests() {
  return request<PrivacyRequestRecord[]>("/api/privacy/requests");
}
export function reviewPrivacyRequest(id: string, action: "VERIFY" | "REJECT" | "RETAIN" | "COMPLETE", note: string) {
  return request<PrivacyRequestRecord>(`/api/privacy/requests/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ action, note }) });
}
export async function downloadPrivacyExport(id: string) {
  const response = await fetch(`${apiUrl}/api/privacy/requests/${encodeURIComponent(id)}/export`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to export this request");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `privacy-${id}.json`;
  link.click();
  URL.revokeObjectURL(url);
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
export type ProfileDetails = {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  emailVerifiedAt: string | null; createdAt: string; pendingEmail: string | null;
  role: { name: string }; branch: { name: string } | null;
  agency: { name: string; email: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; country: string | null } | null;
};
export function getProfile() { return request<ProfileDetails>("/api/auth/profile"); }
export function saveProfile(input: { firstName?: string; lastName?: string; phone?: string | null; agency?: ProfileDetails["agency"] }) {
  return request<ProfileDetails>("/api/auth/profile", { method: "PATCH", body: JSON.stringify(input) });
}
export function requestEmailChange(email: string, password: string) {
  return request<{ pendingEmail: string }>("/api/auth/profile/email-change", { method: "POST", body: JSON.stringify({ email, password }) });
}
export function getNotifications(cursor?: string) {
  return request<
    { items: {
      id: string;
      userId: string | null;
      subject: string;
      message: string;
      status: string;
      channel: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";
      createdAt: string;
      readAt: string | null;
    }[]; nextCursor: string | null }
  >(`/api/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
}
export function getNotificationPreferences() {
  return request<NotificationPreferences>("/api/notifications/preferences");
}
export function saveNotificationPreferences(input: NotificationPreferences) {
  return request<NotificationPreferences>("/api/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
export function markNotificationRead(id: string) {
  return request<unknown>(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}
export function getAgencySettings() {
  return request<AgencyBranding>("/api/agency/settings");
}
export function saveAgencySettings(input: Omit<AgencyBranding, "id">) {
  return request<AgencyBranding>("/api/agency/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
export function requestBookingCancellation(id: string, reason: string) {
  return request<{ id: string; status: string }>(
    `/api/bookings/${encodeURIComponent(id)}/cancellation-request`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}
export function getCancellationRequests() {
  return request<
    {
      id: string;
      reason: string | null;
      createdAt: string;
      booking: {
        id: string;
        pnr: string;
        totalAmount: number | string;
        trip: { route: { source: string; destination: string } };
      };
    }[]
  >("/api/cancellation-requests");
}
export function reviewCancellationRequest(
  id: string,
  approve: boolean,
  note = "",
) {
  return request<{ status: string }>(
    `/api/cancellation-requests/${encodeURIComponent(id)}/review`,
    { method: "POST", body: JSON.stringify({ approve, note }) },
  );
}
export function getSubscription() {
  return request<SubscriptionContract | null>("/api/subscription");
}
export function requestSubscriptionPlan(planName: string, price: number) {
  return request<SubscriptionContract>("/api/subscription", {
    method: "PUT",
    body: JSON.stringify({ planName, price }),
  });
}
export function getAdminSubscription(agencyId: string) {
  return request<SubscriptionContract | null>(
    `/api/admin/agencies/${encodeURIComponent(agencyId)}/subscription`,
  );
}
export function updateAdminSubscription(
  agencyId: string,
  data: {
    planName: string;
    price: number;
    status: SubscriptionContract["status"];
    trialEndsAt?: string | null;
    periodEndsAt?: string | null;
  },
) {
  return request<SubscriptionContract>(
    `/api/admin/agencies/${encodeURIComponent(agencyId)}/subscription`,
    { method: "PUT", body: JSON.stringify(data) },
  );
}
export function getSubscriptionInvoices(agencyId?: string) {
  return request<
    {
      id: string;
      number: string;
      description: string;
      amount: number | string;
      currency: string;
      status: string;
      dueAt: string | null;
      reference: string | null;
    }[]
  >(
    `/api/subscription/invoices${agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : ""}`,
  );
}
export function createSubscriptionInvoice(data: {
  agencyId: string;
  description: string;
  amount: number;
  dueAt?: string;
}) {
  return request<unknown>("/api/subscription/invoices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function markSubscriptionInvoicePaid(
  id: string,
  method: FinanceMethod,
  reference: string,
) {
  return request<unknown>(
    `/api/subscription/invoices/${encodeURIComponent(id)}/paid`,
    { method: "POST", body: JSON.stringify({ method, reference }) },
  );
}
export function getAuditLogs(filters: Record<string, string> = {}) {
  const query = new URLSearchParams(filters).toString();
  return request<
    {
      id: string;
      action: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
      actor: { id: string; firstName: string; lastName: string } | null;
    }[]
  >(`/api/audit-logs${query ? `?${query}` : ""}`);
}
export type WorkspaceRole = { id: string; code: string; name: string; scope: "PLATFORM" | "AGENCY" | "BRANCH"; isSystem: boolean; userCount: number; permissions: string[] };
export type WorkspaceMember = { id: string; firstName: string; lastName: string; email: string; status: "ACTIVE" | "INACTIVE"; roleId: string; branchId: string | null; branchName: string | null };
export type PermissionOption = { id: string; code: string; description: string };
export function getWorkspaceRoles(agencyId?: string) {
  const query = agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : "";
  return request<{ roles: WorkspaceRole[]; permissions: PermissionOption[]; users: WorkspaceMember[] }>(`/api/agency/roles${query}`);
}
export function assignWorkspaceRole(userId: string, roleId: string, agencyId?: string) {
  return request<{ id: string; roleId: string }>(`/api/agency/roles/users/${encodeURIComponent(userId)}`, {
    method: "PATCH", body: JSON.stringify({ roleId, agencyId }),
  });
}
export function customizeWorkspaceMember(userId: string, input: { agencyId?: string; name: string; scope: "AGENCY" | "BRANCH"; permissions: string[] }) {
  return request<{ id: string; roleId: string }>(`/api/agency/roles/users/${encodeURIComponent(userId)}/customize`, {
    method: "POST", body: JSON.stringify(input),
  });
}
export function saveWorkspaceRole(input: { id?: string; agencyId?: string; name: string; scope: "AGENCY" | "BRANCH"; permissions: string[] }) {
  return request<WorkspaceRole>(input.id ? `/api/agency/roles/${encodeURIComponent(input.id)}` : "/api/agency/roles", {
    method: input.id ? "PATCH" : "POST", body: JSON.stringify(input),
  });
}
export function deleteWorkspaceRole(id: string, agencyId?: string) {
  const query = agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : "";
  return request<{ deleted: boolean }>(`/api/agency/roles/${encodeURIComponent(id)}${query}`, { method: "DELETE" });
}
export type BulkEntity = "buses" | "drivers" | "routes" | "stops";
export function previewBulkImport(entity: BulkEntity, rows: Record<string, string>[], agencyId?: string) {
  return request<{ results: { row: number; ok: boolean; message: string }[]; valid: number; invalid: number }>(`/api/bulk/${entity}/import`, { method: "POST", body: JSON.stringify({ rows, agencyId, commit: false }) });
}
export function commitBulkImport(entity: BulkEntity, rows: Record<string, string>[], agencyId?: string) {
  return request<{ results: { row: number; ok: boolean; message: string }[]; valid: number; invalid: number }>(`/api/bulk/${entity}/import`, { method: "POST", body: JSON.stringify({ rows, agencyId, commit: true }) });
}
export async function fetchBulkCsv(entity: BulkEntity, kind: "template" | "export", agencyId?: string) {
  const query = agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : "";
  const response = await fetch(`${apiUrl}/api/bulk/${entity}/${kind}${query}`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to download CSV");
  return response.text();
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
    phone?: string;
    branchId?: string | null;
    roleId?: string;
    status?: string;
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
  seats: {
    name: string;
    type: string;
    restriction: string;
    status: string;
    holdExpiresAt: string | null;
  }[];
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
export type FinanceSettingsData = Omit<FinanceSettingsContract, "agencyId">;
export function getFinanceSettings(agencyId?: string) {
  return request<{
    settings: Omit<FinanceSettingsContract, "tiers"> | null;
    tiers: FinanceSettingsContract["tiers"];
  }>(
    `/api/finance/settings${agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : ""}`,
  );
}
export function saveFinanceSettings(
  data: Omit<
    FinanceSettingsContract,
    "gstRate" | "commissionValue" | "tiers"
  > & {
    gstRate: number;
    commissionValue: number;
    tiers: { hoursBeforeDeparture: number; feePercent: number }[];
  },
) {
  return request<FinanceSettingsData>("/api/finance/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
export type FinanceFilters = FinanceReportFilters;
function financeQuery(filters: FinanceFilters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value) query.set(key, value);
  return query;
}
export function getFinanceReports(
  from?: string,
  to?: string,
  scope: Omit<FinanceFilters, "from" | "to"> = {},
) {
  const query = financeQuery({ ...scope, from, to });
  return request<FinanceReportResponse & { ledger: Record<string, unknown>[] }>(
    `/api/finance/reports?${query}`,
  );
}
export function getFinanceLedger() {
  return request<Record<string, unknown>[]>("/api/finance/ledger");
}
export function getBookingFinanceByPnr(pnr: string) {
  return request<{
    id: string;
    pnr: string;
    status: string;
    totalAmount: number | string;
    taxAmount: number | string;
    payments: {
      id: string;
      amount: number | string;
      method: string;
      reference: string | null;
      receivedAt: string;
    }[];
    refunds: {
      id: string;
      amount: number | string;
      method: string;
      reference: string | null;
      refundedAt: string;
    }[];
    cancellation: {
      eligibleRefund: number | string;
      feeAmount: number | string;
    } | null;
  }>(`/api/finance/bookings/pnr/${encodeURIComponent(pnr)}`);
}
export function recordBookingPayment(
  id: string,
  data: { amount: number; method: FinanceMethod; reference?: string },
) {
  return request<unknown>(`/api/bookings/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function cancelBookingFinance(id: string, reason?: string) {
  return request<{
    eligibleRefund: number;
    feeAmount: number;
    feePercent: number;
  }>(`/api/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
export function recordBookingRefund(
  id: string,
  data: { amount: number; method: FinanceMethod; reference?: string },
) {
  return request<unknown>(`/api/bookings/${id}/refunds`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function postFinanceSettlement(data: {
  party: SettlementParty;
  partyId: string;
  amount: number;
  method: FinanceMethod;
  reference?: string;
}) {
  return request<unknown>("/api/finance/settlements", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function financeExportUrl(
  format: "excel" | "pdf",
  from?: string,
  to?: string,
  scope: Omit<FinanceFilters, "from" | "to"> = {},
) {
  const query = financeQuery({ ...scope, from, to });
  return `${apiUrl}/api/finance/reports/export/${format}?${query}`;
}
export type BookingRecord = {
  id: string;
  pnr: string;
  status: "CONFIRMED" | "CANCELLED";
  cancellationRequest?: { status: "PENDING" | "APPROVED" | "REJECTED" } | null;
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
  return request<{
    rows: number;
    columns: number;
    disabledSeats: string[];
    seatDetails?: Record<string, { type: string; restriction: string }>;
  }>(`/api/buses/${busId}/seat-layout`);
}
export function saveSeatLayout(
  busId: string,
  data: {
    rows: number;
    columns: number;
    disabledSeats: string[];
    seatDetails: Record<string, { type: string; restriction: string }>;
  },
) {
  return request<{
    rows: number;
    columns: number;
    disabledSeats: string[];
    seatDetails?: Record<string, { type: string; restriction: string }>;
  }>(`/api/buses/${busId}/seat-layout`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
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
export type RecurringTripInput = { agencyId?: string; branchId: string; routeId: string; busId: string; driverId: string; tripCode: string; startDate: string; endDate: string; weekdays: number[]; departureTime: string; arrivalTime: string; fare?: number };
export function previewRecurringTrips(data: RecurringTripInput) {
  return request<{ date: string; tripCode: string; departureTime: string; arrivalTime: string; create: boolean; reason?: string }[]>("/api/trips/recurring/preview", { method: "POST", body: JSON.stringify(data) });
}
export function createRecurringTrips(data: RecurringTripInput) {
  return request<{ created: Trip[]; skipped: { date: string; tripCode: string; reason: string }[] }>("/api/trips/recurring", { method: "POST", body: JSON.stringify(data) });
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
