export type AuthContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleName?: string;
  roleScope?: "PLATFORM" | "AGENCY" | "BRANCH";
  agencyId: string | null;
  agencyName?: string | null;
  branchId: string | null;
  permissions: string[];
  onboardingCompleted?: boolean;
};

export type SafeUser = Omit<AuthContext, "userId" | "permissions"> & {
  id: string;
  permissions: string[];
};
