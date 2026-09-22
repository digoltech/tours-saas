export type RoleCode =
  "SUPER_ADMIN" | "AGENCY_ADMIN" | "BRANCH_ADMIN" | "AGENT";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleCode;
  agencyId: string | null;
  branchId: string | null;
  permissions: string[];
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
