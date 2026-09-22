import { SignJWT, jwtVerify } from "jose";
import type { RoleCode, User } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { environment } from "../config/env.js";
import type { AuthContext, SafeUser } from "../types/auth.js";

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
