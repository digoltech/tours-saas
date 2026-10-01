import { describe, expect, test } from "bun:test";
import type { AuthContext } from "../types/auth.js";
import { assignUserRole, customizeUserRole } from "./roles.service.js";

const admin: AuthContext = {
  userId: "admin-1",
  email: "admin@example.com",
  firstName: "Admin",
  lastName: "User",
  role: "AGENCY_ADMIN",
  agencyId: "agency-a",
  branchId: null,
  permissions: ["agent:update"],
};

describe("team access boundaries", () => {
  test("an agency admin cannot assign a role outside their agency", async () => {
    await expect(assignUserRole(admin, "user-2", "role-2", "agency-b")).rejects.toMatchObject({ statusCode: 403 });
  });

  test("an agency admin cannot change their own permissions", async () => {
    await expect(assignUserRole(admin, admin.userId, "role-2")).rejects.toMatchObject({ statusCode: 400 });
    await expect(customizeUserRole(admin, admin.userId, {
      name: "My access", scope: "AGENCY", permissions: ["agent:update"],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("branch users cannot customize team permissions", async () => {
    await expect(customizeUserRole({ ...admin, role: "BRANCH_ADMIN" }, "user-2", {
      name: "Team access", scope: "BRANCH", permissions: [],
    })).rejects.toMatchObject({ statusCode: 403 });
  });
});
