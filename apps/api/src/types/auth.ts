import type { RoleCode } from "@prisma/client";

export type AuthContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleCode;
  agencyId: string | null;
  branchId: string | null;
  permissions: string[];
};

export type SafeUser = Omit<AuthContext, "userId" | "permissions"> & {
  id: string;
  permissions: string[];
};
