import { describe, expect, test } from "bun:test";
import { canManageAgency, canManageBranch, normalizeStatus } from "./management.service.js";

describe("management access helpers", () => {
  test("status normalization accepts only supported values", () => {
    expect(normalizeStatus("ACTIVE")).toBe("ACTIVE");
    expect(normalizeStatus("INACTIVE")).toBe("INACTIVE");
    expect(normalizeStatus("ALL")).toBe("ALL");
    expect(normalizeStatus(undefined)).toBeUndefined();
    expect(normalizeStatus("UNKNOWN")).toBeUndefined();
  });

  test("super admin can manage any agency and branch", () => {
    const context: Parameters<typeof canManageAgency>[0] = {
      userId: "u1",
      email: "admin@example.com",
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      agencyId: null,
      branchId: null,
      permissions: ["agency:create", "agency:update"],
    };
    expect(canManageAgency(context, "agency-a")).toBe(true);
    expect(canManageBranch(context, "agency-a", "branch-a")).toBe(true);
  });

  test("agency admin is restricted to their owned agency", () => {
    const context: Parameters<typeof canManageAgency>[0] = {
      userId: "u2",
      email: "agency@example.com",
      firstName: "Agency",
      lastName: "Admin",
      role: "AGENCY_ADMIN",
      agencyId: "agency-a",
      branchId: null,
      permissions: ["agency:update"],
    };
    expect(canManageAgency(context, "agency-a")).toBe(true);
    expect(canManageAgency(context, "agency-b")).toBe(false);
    expect(canManageBranch(context, "agency-a", "branch-a")).toBe(true);
    expect(canManageBranch(context, "agency-b", "branch-b")).toBe(false);
  });
});
