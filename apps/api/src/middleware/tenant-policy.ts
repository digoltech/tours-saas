import type { AuthContext } from "../types/auth.js";

export function canAccessTenant(
  context: AuthContext,
  agencyId: string,
  branchId?: string,
) {
  if (context.role === "SUPER_ADMIN") return true;
  if (context.agencyId !== agencyId) return false;
  if (
    (context.roleScope === "BRANCH" ||
      (!context.roleScope && (context.role === "BRANCH_ADMIN" || context.role === "AGENT"))) &&
    branchId !== context.branchId
  )
    return false;
  return true;
}

export function isBranchScoped(context: AuthContext) {
  return context.roleScope === "BRANCH" ||
    (!context.roleScope && (context.role === "BRANCH_ADMIN" || context.role === "AGENT"));
}
