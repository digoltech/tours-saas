import { Prisma } from "@prisma/client";
import { canManageTeam, isAgencyOwner } from "@a-one-tours/shared/team-access";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";

export function teamError(message: string, statusCode = 403): never {
  throw Object.assign(new Error(message), { statusCode, code: statusCode === 400 ? "INVALID_REQUEST" : "FORBIDDEN" });
}

export function assertTeamManager(context: AuthContext) {
  if (!canManageTeam(context.role)) teamError("Only agency owners and branch admins can manage employees");
}

export function assertManagedMember(context: AuthContext, member: {
  id: string; agencyId: string | null; branchId: string | null; role: { code: string };
}, write = true) {
  assertTeamManager(context);
  if (member.role.code === "SUPER_ADMIN") teamError("Platform administrators cannot be managed here");
  if (context.role !== "SUPER_ADMIN" && (!member.agencyId || context.agencyId !== member.agencyId))
    teamError("This team member belongs to another agency");
  if (write && member.id === context.userId) teamError("Use your profile to edit your own account; you cannot change your own access", 400);
  if (context.role === "BRANCH_ADMIN" &&
      (!context.branchId || member.branchId !== context.branchId || member.role.code !== "AGENT"))
    teamError("Branch admins can manage only employees in their own branch");
}

export function assertAssignableRole(context: AuthContext, role: { code: string; agencyId: string | null; isSystem: boolean }, agencyId: string) {
  assertTeamManager(context);
  if (role.code === "SUPER_ADMIN" || (!role.isSystem && role.agencyId !== agencyId)) teamError("Role is not available for this agency", 400);
  if (!isAgencyOwner(context.role) && role.code !== "AGENT") teamError("Only agency owners can appoint admins or assign custom roles");
}

export async function assertActiveBranch(agencyId: string, branchId: string | null | undefined) {
  if (!branchId) teamError("Select an active branch for this team member", 400);
  const branch = await prisma.branch.findFirst({ where: { id: branchId, agencyId, status: "ACTIVE" } });
  if (!branch) teamError("The selected branch must be active and belong to this agency", 400);
  return branch;
}

// Serialize changes to owners so concurrent requests cannot remove the last owner.
export async function protectLastOwner(tx: Prisma.TransactionClient, agencyId: string, memberId: string,
  next: { roleCode?: string; status?: string }) {
  await tx.$queryRaw`SELECT id FROM "Agency" WHERE id = ${agencyId} FOR UPDATE`;
  const current = await tx.user.findUnique({ where: { id: memberId }, include: { role: true } });
  if (current?.role.code !== "AGENCY_ADMIN" || current.status !== "ACTIVE") return;
  if ((next.roleCode ?? current.role.code) === "AGENCY_ADMIN" && (next.status ?? current.status) === "ACTIVE") return;
  if (await tx.user.count({ where: { agencyId, status: "ACTIVE", role: { code: "AGENCY_ADMIN" } } }) <= 1)
    teamError("The agency must retain at least one active owner", 400);
}
