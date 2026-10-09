import type { AuthContext } from "../types/auth.js";

export function canAccessTenant(
  context: AuthContext,
  agencyId: string,
  branchId?: string,
) {
  if (context.role === "SUPER_ADMIN") return true;
  if (context.agencyId !== agencyId) return false;
  if (isBranchScoped(context) && branchId !== undefined && branchId !== context.branchId)
    return false;
  return true;
}

export function isBranchScoped(context: AuthContext) {
  return !["SUPER_ADMIN", "AGENCY_ADMIN"].includes(context.role) &&
    (context.roleScope === "BRANCH" || context.role === "BRANCH_ADMIN" || context.role === "AGENT");
}
