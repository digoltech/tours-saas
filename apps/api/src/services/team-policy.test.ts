import { describe, expect, test } from "bun:test";
import type { Prisma } from "@prisma/client";
import { standardRolePermissions, standardRoleNames } from "@a-one-tours/shared/team-access";
import { canAccessTenant, isBranchScoped } from "../middleware/tenant-policy.js";
import type { AuthContext } from "../types/auth.js";
import { assertAssignableRole, assertManagedMember, assertTeamManager, protectLastOwner } from "./team-policy.js";

const owner: AuthContext = { userId: "owner", role: "AGENCY_ADMIN", roleScope: "AGENCY", agencyId: "agency-a", branchId: "branch-a", email: "owner@example.invalid", firstName: "Owner", lastName: "User", permissions: [] };
const branchAdmin = { ...owner, userId: "admin", role: "BRANCH_ADMIN", roleScope: "BRANCH" as const };
const employee = { ...owner, userId: "employee", role: "AGENT", roleScope: "BRANCH" as const };
const member = { id: "staff", agencyId: "agency-a", branchId: "branch-a", role: { code: "AGENT" } };
const role = (code: string) => ({ code, isSystem: true, agencyId: null });

describe("simplified team hierarchy", () => {
  test("owners retain agency access even when assigned to their main branch", () => {
    expect(isBranchScoped(owner)).toBe(false);
    expect(canAccessTenant(owner, "agency-a", "branch-b")).toBe(true);
    expect(canAccessTenant(owner, "agency-b", "branch-b")).toBe(false);
  });
  test("employees access colleagues' branch records and shared agency definitions", () => {
    expect(canAccessTenant(employee, "agency-a", "branch-a")).toBe(true);
    expect(canAccessTenant(employee, "agency-a")).toBe(true);
    expect(canAccessTenant(employee, "agency-a", "branch-b")).toBe(false);
    expect(canAccessTenant(employee, "agency-b", "branch-a")).toBe(false);
    expect(isBranchScoped({ ...employee, roleScope: "AGENCY" })).toBe(true);
  });
  test("branch admins manage only standard employees in their own branch", () => {
    expect(() => assertManagedMember(branchAdmin, member)).not.toThrow();
    for (const target of [
      { ...member, branchId: "branch-b" }, { ...member, agencyId: "agency-b" },
      { ...member, role: { code: "BRANCH_ADMIN" } }, { ...member, role: { code: "AGENCY_ADMIN" } },
      { ...member, role: { code: "CUSTOM_ROLE" } },
    ]) expect(() => assertManagedMember(branchAdmin, target)).toThrow();
  });
  test("employees cannot manage staff, and nobody can change their own access", () => {
    expect(() => assertTeamManager(employee)).toThrow();
    expect(() => assertManagedMember(owner, { ...member, id: owner.userId, role: { code: "AGENCY_ADMIN" } })).toThrow();
  });
  test("only owners appoint branch admins and assign custom roles", () => {
    expect(() => assertAssignableRole(branchAdmin, role("AGENT"), "agency-a")).not.toThrow();
    expect(() => assertAssignableRole(branchAdmin, role("BRANCH_ADMIN"), "agency-a")).toThrow();
    expect(() => assertAssignableRole(owner, role("BRANCH_ADMIN"), "agency-a")).not.toThrow();
    expect(() => assertAssignableRole(owner, role("SUPER_ADMIN"), "agency-a")).toThrow();
    expect(() => assertAssignableRole(owner, { code: "CUSTOM", isSystem: false, agencyId: "agency-b" }, "agency-a")).toThrow();
  });
  test("employees have operational permissions without staff or agency controls", () => {
    expect(standardRoleNames.AGENT).toBe("Employee");
    expect(standardRolePermissions.AGENT).toContain("trip:create");
    expect(standardRolePermissions.AGENT).toContain("finance:refund");
    expect(standardRolePermissions.AGENT).toContain("finance:settlement");
    expect(standardRolePermissions.AGENT).not.toContain("agent:update");
    expect(standardRolePermissions.AGENT).not.toContain("route:update");
    expect(standardRolePermissions.BRANCH_ADMIN).toContain("agent:create");
    expect(standardRolePermissions.BRANCH_ADMIN).not.toContain("branch:create");
  });
  test("the last active owner cannot be demoted or deactivated", async () => {
    const calls: string[] = [];
    const tx = {
      $queryRaw: async () => { calls.push("agency-lock"); },
      user: { findUnique: async () => ({ role: { code: "AGENCY_ADMIN" }, status: "ACTIVE" }), count: async () => 1 },
    } as unknown as Prisma.TransactionClient;
    await expect(protectLastOwner(tx, "agency-a", "owner", { roleCode: "AGENT" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(protectLastOwner(tx, "agency-a", "owner", { status: "INACTIVE" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(protectLastOwner(tx, "agency-a", "owner", { status: "ACTIVE" })).resolves.toBeUndefined();
    expect(calls).toHaveLength(3);
  });
});
