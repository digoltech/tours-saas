export type RoleCode = string;

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleCode;
  roleName?: string;
  roleScope?: "PLATFORM" | "AGENCY" | "BRANCH";
  agencyId: string | null;
  agencyName?: string | null;
  branchId: string | null;
  permissions: string[];
  onboardingCompleted: boolean;
  emailVerified?: boolean;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
