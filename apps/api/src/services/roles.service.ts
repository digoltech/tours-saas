import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";

type Err = Error & { statusCode?: number; code?: string };
function fail(statusCode: number, code: string, message: string): never {
  const error = new Error(message) as Err;
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}
function agencyFor(context: AuthContext, requested?: string) {
  if (context.role === "SUPER_ADMIN") {
    if (!requested) fail(400, "INVALID_REQUEST", "agencyId is required");
    return requested;
  }
  if (!context.agencyId || (requested && requested !== context.agencyId))
    fail(403, "FORBIDDEN", "You cannot manage roles for this agency");
  return context.agencyId;
}
async function ensureAgencyAdmin(context: AuthContext, agencyId?: string) {
  const resolved = agencyFor(context, agencyId);
  if (context.role !== "SUPER_ADMIN" && context.role !== "AGENCY_ADMIN")
    fail(403, "FORBIDDEN", "Only agency admins can manage custom roles");
  return resolved;
}
const roleInclude = {
  permissions: { include: { permission: { select: { code: true, description: true } } } },
} satisfies Prisma.RoleInclude;

export async function listRoles(context: AuthContext, requested?: string) {
  const agencyId = agencyFor(context, requested);
  if (context.role !== "SUPER_ADMIN" && !context.permissions.includes("agent:create") && !context.permissions.includes("agent:update"))
    fail(403, "FORBIDDEN", "You do not have permission to view assignable roles");
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { OR: [{ isSystem: true }, { agencyId }] },
      include: roleInclude,
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.permission.findMany({ orderBy: { code: "asc" } }),
  ]);
  return {
    roles: roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      scope: role.scope,
      isSystem: role.isSystem,
      permissions: role.permissions.map((item) => item.permission.code),
    })),
    permissions,
  };
}

export async function createRole(
  context: AuthContext,
  input: { agencyId?: string; name: string; scope: "AGENCY" | "BRANCH"; permissions: string[] },
) {
  const agencyId = await ensureAgencyAdmin(context, input.agencyId);
  if (input.scope === "BRANCH" && input.permissions.some((code) => ["agency:create", "agency:update", "agency:delete"].includes(code)))
    fail(400, "INVALID_REQUEST", "Branch-scoped roles cannot manage agency-wide settings");
  const allowed = await prisma.permission.findMany({ where: { code: { in: input.permissions } }, select: { id: true, code: true } });
  if (allowed.length !== new Set(input.permissions).size)
    fail(400, "INVALID_REQUEST", "One or more permissions are not available");
  const role = await prisma.role.create({
    data: {
      code: `CUSTOM_${randomUUID()}`,
      name: input.name.trim(),
      scope: input.scope,
      isSystem: false,
      agencyId,
      permissions: { create: allowed.map(({ id }) => ({ permissionId: id })) },
    },
    include: roleInclude,
  });
  await prisma.auditLog.create({ data: { agencyId, actorId: context.userId, action: "ROLE_CREATED", entityType: "Role", entityId: role.id, details: { name: role.name, scope: role.scope, permissionCount: allowed.length } } });
  return role;
}

export async function updateRole(
  context: AuthContext,
  id: string,
  input: { agencyId?: string; name: string; scope: "AGENCY" | "BRANCH"; permissions: string[] },
) {
  const agencyId = await ensureAgencyAdmin(context, input.agencyId);
  const role = await prisma.role.findUnique({ where: { id }, include: roleInclude });
  if (!role || role.isSystem || role.agencyId !== agencyId)
    fail(404, "NOT_FOUND", "Custom role not found");
  if (input.scope === "BRANCH" && input.permissions.some((code) => ["agency:create", "agency:update", "agency:delete"].includes(code)))
    fail(400, "INVALID_REQUEST", "Branch-scoped roles cannot manage agency-wide settings");
  const allowed = await prisma.permission.findMany({ where: { code: { in: input.permissions } }, select: { id: true, code: true } });
  if (allowed.length !== new Set(input.permissions).size)
    fail(400, "INVALID_REQUEST", "One or more permissions are not available");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    return tx.role.update({ where: { id }, data: {
      name: input.name.trim(), scope: input.scope,
      permissions: { create: allowed.map(({ id: permissionId }) => ({ permissionId })) },
    }, include: roleInclude });
  });
  await prisma.auditLog.create({ data: { agencyId, actorId: context.userId, action: "ROLE_UPDATED", entityType: "Role", entityId: id, details: { name: updated.name, scope: updated.scope, permissionCount: allowed.length } } });
  return updated;
}

export async function deleteRole(context: AuthContext, id: string, requested?: string) {
  const agencyId = await ensureAgencyAdmin(context, requested);
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true, invitations: true } } } });
  if (!role || role.isSystem || role.agencyId !== agencyId)
    fail(404, "NOT_FOUND", "Custom role not found");
  if (role._count.users || role._count.invitations)
    fail(409, "CONFLICT", "Reassign users and invitations before deleting this role");
  await prisma.role.delete({ where: { id } });
  await prisma.auditLog.create({ data: { agencyId, actorId: context.userId, action: "ROLE_DELETED", entityType: "Role", entityId: id, details: { name: role.name } } });
  return { deleted: true };
}
