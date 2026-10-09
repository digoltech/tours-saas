import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { createEmailVerificationToken, verifyPassword } from "./auth.service.js";
import { sendEmailChangeConfirmation } from "./email.service.js";
import { environment } from "../config/env.js";
import { standardRoleNames } from "@a-one-tours/shared/team-access";

function fail(statusCode: number, code: string, message: string): never {
  throw Object.assign(new Error(message), { statusCode, code });
}

export async function getProfile(context: AuthContext) {
  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      emailVerifiedAt: true, createdAt: true,
      agency: { select: { name: true, email: true, phone: true, address: true, city: true, state: true, country: true } },
      branch: { select: { name: true } },
      role: { select: { name: true, code: true } },
      emailVerificationTokens: {
        where: { pendingEmail: { not: null }, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" }, take: 1,
        select: { pendingEmail: true },
      },
    },
  });
  if (!user) fail(404, "NOT_FOUND", "Account not found");
  const { emailVerificationTokens, ...details } = user;
  return { ...details, role: { name: standardRoleNames[user.role.code] ?? user.role.name }, pendingEmail: emailVerificationTokens[0]?.pendingEmail ?? null };
}

export async function updateProfile(context: AuthContext, input: {
  firstName?: string; lastName?: string; phone?: string | null;
  agency?: { name: string; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; state?: string | null; country?: string | null };
}) {
  if (input.agency && (context.roleScope !== "AGENCY" || !context.agencyId || !context.permissions.includes("agency:update")))
    fail(403, "FORBIDDEN", "Only agency administrators can edit agency details");
  await prisma.$transaction(async (tx) => {
    if (input.firstName !== undefined || input.lastName !== undefined || input.phone !== undefined)
      await tx.user.update({ where: { id: context.userId }, data: {
        firstName: input.firstName, lastName: input.lastName, phone: input.phone,
      } });
    if (input.agency && context.agencyId)
      await tx.agency.update({ where: { id: context.agencyId }, data: input.agency });
  });
  return getProfile(context);
}

export async function requestEmailChange(context: AuthContext, email: string, password: string) {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { id: context.userId }, select: { passwordHash: true, email: true, firstName: true } });
  if (!user) fail(404, "NOT_FOUND", "Account not found");
  if (!(await verifyPassword(password, user.passwordHash))) fail(401, "INVALID_CREDENTIALS", "Current password is incorrect");
  if (normalized === user.email) fail(400, "INVALID_REQUEST", "Enter a different email address");
  if (await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } }))
    fail(409, "CONFLICT", "This email address is already in use");
  const token = await createEmailVerificationToken(context.userId, normalized);
  try {
    await sendEmailChangeConfirmation({ email: normalized, firstName: user.firstName,
      verificationUrl: `${environment.WEB_URL}/auth/verify-email?token=${encodeURIComponent(token)}` });
  } catch (error) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: context.userId, pendingEmail: normalized, usedAt: null } });
    throw error;
  }
  return { pendingEmail: normalized };
}

export function isEmailConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
