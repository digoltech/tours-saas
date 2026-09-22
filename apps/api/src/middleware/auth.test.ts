import { describe, expect, test } from "bun:test";
import { canAccessTenant } from "./tenant-policy.js";
import type { AuthContext } from "../types/auth.js";

const context = (
  role: AuthContext["role"],
  agencyId: string | null,
  branchId: string | null,
): AuthContext => ({
  userId: "user",
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
  role,
  agencyId,
  branchId,
  permissions: ["agency:read"],
});

describe("tenant access policy", () => {
  test("super admin can access both agencies", () => {
    expect(
      canAccessTenant(context("SUPER_ADMIN", null, null), "agency-a"),
    ).toBe(true);
    expect(
      canAccessTenant(context("SUPER_ADMIN", null, null), "agency-b"),
    ).toBe(true);
  });

  test("agency admin is limited to its agency", () => {
    expect(
      canAccessTenant(context("AGENCY_ADMIN", "agency-a", null), "agency-a"),
    ).toBe(true);
    expect(
      canAccessTenant(context("AGENCY_ADMIN", "agency-a", null), "agency-b"),
    ).toBe(false);
  });

  test("branch admin and agent are limited to agency and branch", () => {
    const branchAdmin = context("BRANCH_ADMIN", "agency-a", "branch-a1");
    const agent = context("AGENT", "agency-a", "branch-a1");
    expect(canAccessTenant(branchAdmin, "agency-a", "branch-a1")).toBe(true);
    expect(canAccessTenant(branchAdmin, "agency-a", "branch-a2")).toBe(false);
    expect(canAccessTenant(agent, "agency-b", "branch-b1")).toBe(false);
  });

  test("client tenant manipulation cannot expand access", () => {
    expect(
      canAccessTenant(
        context("AGENT", "agency-a", "branch-a1"),
        "agency-b",
        "branch-a1",
      ),
    ).toBe(false);
  });
});
