import { describe, expect, test } from "bun:test";
import { canReviewPrivacyRequest, passengerMatches } from "./privacy.service.js";
import { accountIsActive, sessionIsActive } from "./auth.service.js";
import type { User } from "@prisma/client";
import type { AuthContext } from "../types/auth.js";

const context = (role: string, agencyId: string | null): AuthContext => ({ userId: "user", email: "u@example.com", firstName: "Test", lastName: "User", role, agencyId, branchId: null, permissions: [] });

describe("privacy and session boundaries", () => {
  test("only platform admin or the owning agency admin can review", () => {
    expect(canReviewPrivacyRequest(context("SUPER_ADMIN", null), null)).toBe(true);
    expect(canReviewPrivacyRequest(context("AGENCY_ADMIN", "agency-a"), "agency-a")).toBe(true);
    expect(canReviewPrivacyRequest(context("AGENCY_ADMIN", "agency-a"), "agency-b")).toBe(false);
    expect(canReviewPrivacyRequest(context("AGENT", "agency-a"), "agency-a")).toBe(false);
    expect(canReviewPrivacyRequest(context("AGENCY_ADMIN", "agency-a"), null)).toBe(false);
  });

  test("passenger matching requires both name and booking contact", () => {
    const passenger = { firstName: "Asha", lastName: "Shah", email: null, phone: "+91 99999 11111" };
    expect(passengerMatches(passenger, { type: "ACCESS", subjectName: "Asha Shah", contactPhone: "9999911111" })).toBe(true);
    expect(passengerMatches(passenger, { type: "ACCESS", subjectName: "Asha Shah", contactPhone: "9999911112" })).toBe(false);
    expect(passengerMatches(passenger, { type: "ACCESS", subjectName: "Other User", contactPhone: "9999911111" })).toBe(false);
  });

  test("revoked, expired, and foreign-user sessions cannot authenticate", () => {
    const later = new Date(Date.now() + 60_000);
    expect(sessionIsActive({ userId: "user", revokedAt: null, expiresAt: later }, "user")).toBe(true);
    expect(sessionIsActive({ userId: "user", revokedAt: new Date(), expiresAt: later }, "user")).toBe(false);
    expect(sessionIsActive({ userId: "user", revokedAt: null, expiresAt: later }, "other")).toBe(false);
    expect(sessionIsActive({ userId: "user", revokedAt: null, expiresAt: new Date(0) }, "user")).toBe(false);
  });

  test("inactive agencies and branches invalidate staff access", () => {
    const user = { status: "ACTIVE", agency: { name: "A", status: "ACTIVE" }, branch: { status: "ACTIVE" } } as unknown as User & { role: never; agency: { name: string; status: string }; branch: { status: string } };
    expect(accountIsActive(user)).toBe(true);
    expect(accountIsActive({ ...user, agency: { name: "A", status: "INACTIVE" } })).toBe(false);
    expect(accountIsActive({ ...user, branch: { status: "INACTIVE" } })).toBe(false);
    expect(accountIsActive({ ...user, status: "INACTIVE" })).toBe(false);
  });
});
