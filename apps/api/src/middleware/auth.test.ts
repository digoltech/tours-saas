import { describe, expect, test } from "bun:test";
import { canAccessTenant, isBranchScoped } from "./tenant-policy.js";
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

  test("custom branch-scoped roles stay within their assigned branch", () => {
    const operator = { ...context("CUSTOM_FLEET", "agency-a", "branch-a1"), roleScope: "BRANCH" as const };
    expect(isBranchScoped(operator)).toBe(true);
    expect(canAccessTenant(operator, "agency-a", "branch-a1")).toBe(true);
    expect(canAccessTenant(operator, "agency-a", "branch-a2")).toBe(false);
    expect(canAccessTenant(operator, "agency-b", "branch-a1")).toBe(false);
  });

  test("custom agency-scoped roles can access only their own agency", () => {
    const manager = { ...context("CUSTOM_MANAGER", "agency-a", "branch-a1"), roleScope: "AGENCY" as const };
    expect(isBranchScoped(manager)).toBe(false);
    expect(canAccessTenant(manager, "agency-a", "branch-a2")).toBe(true);
    expect(canAccessTenant(manager, "agency-b", "branch-b1")).toBe(false);
  });
});
