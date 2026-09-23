import { SignJWT, jwtVerify } from "jose";
import { randomInt } from "node:crypto";
import { Prisma, type RoleCode, type User } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { environment } from "../config/env.js";
import type { AuthContext, SafeUser } from "../types/auth.js";
import { sendPasswordResetOtp } from "./email.service.js";

const secret = new TextEncoder().encode(environment.JWT_SECRET);

type UserWithAccess = User & {
  role: { code: RoleCode; permissions: { permission: { code: string } }[] };
};

export function toAuthContext(user: UserWithAccess): AuthContext {
  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.code,
    agencyId: user.agencyId,
    branchId: user.branchId,
    permissions: user.role.permissions.map(({ permission }) => permission.code),
    onboardingCompleted: user.onboardingCompleted,
  };
}

export function toSafeUser(context: AuthContext): SafeUser {
  return {
    id: context.userId,
    email: context.email,
    firstName: context.firstName,
    lastName: context.lastName,
    role: context.role,
    agencyId: context.agencyId,
    branchId: context.branchId,
    permissions: context.permissions,
    onboardingCompleted: context.onboardingCompleted !== false,
  };
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
}

export async function createSession(user: AuthContext) {
  return new SignJWT({ type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (payload.type !== "session" || typeof payload.sub !== "string")
    return null;
  return findUserById(payload.sub);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return Bun.password.verify(password, passwordHash);
}

export async function hashPassword(password: string) {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export async function registerUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agencyName: string;
  branchName: string;
}) {
  const email = input.email.toLowerCase().trim();
  const role = await prisma.role.findUnique({ where: { code: "AGENCY_ADMIN" } });
  if (!role) throw new Error("Agency Admin role is not configured");
  const slug = `${input.agencyName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.$transaction(async (transaction) => {
      const agency = await transaction.agency.create({
        data: { name: input.agencyName.trim(), slug },
      });
      const branch = await transaction.branch.create({
        data: { agencyId: agency.id, name: input.branchName.trim(), code: "MAIN" },
      });
      return transaction.user.create({
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email,
          passwordHash,
          roleId: role.id,
          agencyId: agency.id,
          branchId: branch.id,
          onboardingCompleted: false,
        },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const conflict = new Error("An account with this email already exists") as Error & { statusCode?: number; code?: string };
      conflict.statusCode = 409;
      conflict.code = "CONFLICT";
      throw conflict;
    }
    throw error;
  }
}

export async function completeOnboarding(userId: string, input: { agencyName: string; branchName: string; phone?: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.agencyId || !user.branchId) throw new Error("Onboarding account is invalid");
  await prisma.$transaction([
    prisma.agency.update({ where: { id: user.agencyId }, data: { name: input.agencyName.trim() } }),
    prisma.branch.update({ where: { id: user.branchId }, data: { name: input.branchName.trim(), phone: input.phone?.trim() || undefined } }),
    prisma.user.update({ where: { id: userId }, data: { phone: input.phone?.trim() || undefined, onboardingCompleted: true } }),
  ]);
  const updated = await findUserById(userId);
  if (!updated) throw new Error("Unable to reload account");
  return toAuthContext(updated);
}

function randomOtp() {
  return String(randomInt(100000, 1000000));
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.status !== "ACTIVE") return;
  await prisma.passwordResetOtp.deleteMany({ where: { userId: user.id, usedAt: null } });
  const otp = randomOtp();
  const record = await prisma.passwordResetOtp.create({
    data: {
      userId: user.id,
      email: normalizedEmail,
      codeHash: await hashPassword(otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  try {
    await sendPasswordResetOtp(normalizedEmail, otp);
  } catch (error) {
    await prisma.passwordResetOtp.delete({ where: { id: record.id } });
    throw error;
  }
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  const record = await prisma.passwordResetOtp.findFirst({
    where: { email: email.toLowerCase().trim(), usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.attempts >= 5 || !(await verifyPassword(otp, record.codeHash))) {
    if (record) await prisma.passwordResetOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    const error = new Error("The reset code is invalid or expired") as Error & { statusCode?: number; code?: string };
    error.statusCode = 400;
    error.code = "INVALID_OTP";
    throw error;
  }
  await prisma.passwordResetOtp.update({ where: { id: record.id }, data: { verifiedAt: new Date() } });
}

export async function resetPassword(email: string, otp: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const record = await prisma.passwordResetOtp.findFirst({
    where: { email: normalizedEmail, usedAt: null, verifiedAt: { not: null }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record || !(await verifyPassword(otp, record.codeHash))) {
    const error = new Error("Verify the reset code before choosing a new password") as Error & { statusCode?: number; code?: string };
    error.statusCode = 400;
    error.code = "RESET_NOT_VERIFIED";
    throw error;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordResetOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}
