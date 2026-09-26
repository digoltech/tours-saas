import { createHash, randomBytes } from "node:crypto";
import { Prisma, RecordStatus, RoleCode } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "./auth.service.js";
import type { AuthContext } from "../types/auth.js";
import { environment } from "../config/env.js";
import { sendTeamInvitation, sendTeamWelcome } from "./email.service.js";

export type AgencyQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: RecordStatus | "ALL";
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export function normalizeStatus(
  value: string | undefined,
): RecordStatus | "ALL" | undefined {
  if (!value || value === "ALL") return value === "ALL" ? "ALL" : undefined;
  if (value === "ACTIVE" || value === "INACTIVE") return value as RecordStatus;
  return undefined;
}

export function canManageAgency(context: AuthContext, agencyId: string | null) {
  if (context.role === "SUPER_ADMIN") return true;
  return !!agencyId && context.agencyId === agencyId;
}

export function canManageBranch(
  context: AuthContext,
  agencyId: string | null,
  branchId: string | null,
) {
  if (context.role === "SUPER_ADMIN") return true;
  if (!agencyId || context.agencyId !== agencyId) return false;
  if (context.role === "AGENCY_ADMIN") return true;
  if (!branchId) return false;
  return context.branchId === branchId;
}

function ensureAgencyAccess(context: AuthContext, agencyId: string | null) {
  if (!canManageAgency(context, agencyId)) {
    const error = new Error(
      "You do not have access to this agency",
    ) as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
}

function ensureBranchAccess(
  context: AuthContext,
  agencyId: string | null,
  branchId: string | null,
) {
  if (!canManageBranch(context, agencyId, branchId)) {
    const error = new Error(
      "You do not have access to this branch",
    ) as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
}

function parseListResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
) {
  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getDashboardSummary(context: AuthContext) {
  if (context.role !== "SUPER_ADMIN") {
    const error = new Error(
      "Platform-wide dashboard stats are restricted to Super Admin",
    ) as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const [
    totalAgencies,
    activeAgencies,
    totalBranches,
    totalAgents,
    totalBuses,
    totalDrivers,
    totalRoutes,
    totalTrips,
  ] = await Promise.all([
    prisma.agency.count(),
    prisma.agency.count({ where: { status: RecordStatus.ACTIVE } }),
    prisma.branch.count(),
    prisma.user.count({ where: { role: { code: RoleCode.AGENT } } }),
    prisma.bus.count(),
    prisma.driver.count(),
    prisma.route.count(),
    prisma.trip.count(),
  ]);

  return {
    success: true,
    data: {
      totalAgencies,
      activeAgencies,
      totalBranches,
      totalAgents,
      totalBuses,
      totalDrivers,
      totalRoutes,
      totalTrips,
    },
  };
}

export async function listAgencies(context: AuthContext, query: AgencyQuery) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const search = (query.search ?? "").trim();
  const status = normalizeStatus(query.status as string | undefined);

  const searchClause: Prisma.AgencyWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const where: Prisma.AgencyWhereInput = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...searchClause,
    ...(context.role !== "SUPER_ADMIN"
      ? { id: context.agencyId ?? "__missing__" }
      : {}),
  };

  const [total, agencies] = await Promise.all([
    prisma.agency.count({ where }),
    prisma.agency.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { branches: true, users: true },
        },
      },
    }),
  ]);

  return parseListResponse(
    agencies.map((agency) => ({
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      email: agency.email,
      phone: agency.phone,
      address: agency.address,
      city: agency.city,
      state: agency.state,
      country: agency.country,
      status: agency.status,
      branchCount: agency._count.branches,
      agentCount: agency._count.users,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    })),
    page,
    limit,
    total,
  );
}

export async function getAgency(context: AuthContext, agencyId: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: {
      _count: { select: { branches: true, users: true } },
    },
  });
  if (!agency) {
    const error = new Error("Agency not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  ensureAgencyAccess(context, agency.id);
  return {
    ...agency,
    agentCount: agency._count.users,
    branchCount: agency._count.branches,
  };
}

export async function createAgency(
  context: AuthContext,
  data: {
    name: string;
    slug: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    status?: RecordStatus;
  },
) {
  if (context.role !== "SUPER_ADMIN") {
    const error = new Error("Only Super Admin can create agencies") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const name = data.name?.trim();
  const slug = data.slug?.trim();
  if (!name || !slug) {
    const error = new Error("Agency name and slug are required") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "INVALID_REQUEST";
    throw error;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name,
          slug: slug.toLowerCase(),
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
          country: data.country?.trim() || null,
          status: data.status ?? RecordStatus.ACTIVE,
        },
      });
      await tx.subscription.create({
        data: {
          agencyId: agency.id,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      return agency;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = new Error("Agency code already exists") as Error & {
        statusCode?: number;
        code?: string;
      };
      duplicate.statusCode = 409;
      duplicate.code = "CONFLICT";
      throw duplicate;
    }
    throw error;
  }
}

export async function updateAgency(
  context: AuthContext,
  agencyId: string,
  data: Partial<{
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    status: RecordStatus;
  }>,
) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) {
    const error = new Error("Agency not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  ensureAgencyAccess(context, agency.id);

  const nextData: Prisma.AgencyUpdateInput = {};
  if (data.name !== undefined) nextData.name = data.name.trim();
  if (data.slug !== undefined) nextData.slug = data.slug.trim().toLowerCase();
  if (data.email !== undefined) nextData.email = data.email ?? null;
  if (data.phone !== undefined) nextData.phone = data.phone ?? null;
  if (data.address !== undefined) nextData.address = data.address ?? null;
  if (data.city !== undefined) nextData.city = data.city ?? null;
  if (data.state !== undefined) nextData.state = data.state ?? null;
  if (data.country !== undefined) nextData.country = data.country ?? null;
  if (data.status !== undefined) nextData.status = data.status;

  try {
    return await prisma.agency.update({
      where: { id: agencyId },
      data: nextData,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = new Error("Agency code already exists") as Error & {
        statusCode?: number;
        code?: string;
      };
      duplicate.statusCode = 409;
      duplicate.code = "CONFLICT";
      throw duplicate;
    }
    throw error;
  }
}

export async function deactivateAgency(context: AuthContext, agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) {
    const error = new Error("Agency not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  ensureAgencyAccess(context, agency.id);
  return prisma.agency.update({
    where: { id: agencyId },
    data: { status: RecordStatus.INACTIVE },
  });
}

export async function listBranches(
  context: AuthContext,
  agencyId: string,
  query: AgencyQuery & { branchStatus?: RecordStatus | "ALL" },
) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const search = (query.search ?? "").trim();
  const status = normalizeStatus(
    (query.branchStatus ?? query.status) as string | undefined,
  );
  const searchClause: Prisma.BranchWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  ensureAgencyAccess(context, agencyId);

  const where: Prisma.BranchWhereInput = {
    agencyId,
    ...(status && status !== "ALL" ? { status } : {}),
    ...searchClause,
  };

  const [total, branches] = await Promise.all([
    prisma.branch.count({ where }),
    prisma.branch.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);

  return parseListResponse(
    branches.map((branch) => ({
      ...branch,
      agentCount: branch._count.users,
    })),
    page,
    limit,
    total,
  );
}

export async function getBranch(context: AuthContext, branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { agency: true, _count: { select: { users: true } } },
  });
  if (!branch) {
    const error = new Error("Branch not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  ensureBranchAccess(context, branch.agencyId, branch.id);
  return branch;
}

export async function createBranch(
  context: AuthContext,
  agencyId: string,
  data: {
    name: string;
    code: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    status?: RecordStatus;
  },
) {
  ensureAgencyAccess(context, agencyId);
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) {
    const error = new Error("Agency not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }

  const name = data.name?.trim();
  const code = data.code?.trim();
  if (!name || !code) {
    const error = new Error("Branch name and code are required") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "INVALID_REQUEST";
    throw error;
  }

  try {
    return prisma.branch.create({
      data: {
        agencyId,
        name,
        code: code.toUpperCase(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || null,
        status: data.status ?? RecordStatus.ACTIVE,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = new Error(
        "Branch code already exists for this agency",
      ) as Error & { statusCode?: number; code?: string };
      duplicate.statusCode = 409;
      duplicate.code = "CONFLICT";
      throw duplicate;
    }
    throw error;
  }
}

export async function updateBranch(
  context: AuthContext,
  branchId: string,
  data: Partial<{
    name: string;
    code: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    status: RecordStatus;
  }>,
) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    const error = new Error("Branch not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  ensureBranchAccess(context, branch.agencyId, branch.id);

  const nextData: Prisma.BranchUpdateInput = {};
  if (data.name !== undefined) nextData.name = data.name.trim();
  if (data.code !== undefined) nextData.code = data.code.trim().toUpperCase();
  if (data.email !== undefined) nextData.email = data.email ?? null;
  if (data.phone !== undefined) nextData.phone = data.phone ?? null;
  if (data.address !== undefined) nextData.address = data.address ?? null;
  if (data.city !== undefined) nextData.city = data.city ?? null;
  if (data.state !== undefined) nextData.state = data.state ?? null;
  if (data.country !== undefined) nextData.country = data.country ?? null;
  if (data.status !== undefined) nextData.status = data.status;

  try {
    return prisma.branch.update({ where: { id: branchId }, data: nextData });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = new Error(
        "Branch code already exists for this agency",
      ) as Error & { statusCode?: number; code?: string };
      duplicate.statusCode = 409;
      duplicate.code = "CONFLICT";
      throw duplicate;
    }
    throw error;
  }
}

export async function deactivateBranch(context: AuthContext, branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    const error = new Error("Branch not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  ensureBranchAccess(context, branch.agencyId, branch.id);
  return prisma.branch.update({
    where: { id: branchId },
    data: { status: RecordStatus.INACTIVE },
  });
}

export async function listAgents(
  context: AuthContext,
  agencyId: string,
  query: AgencyQuery & {
    branchId?: string;
    status?: RecordStatus | "ALL";
    branchStatus?: RecordStatus | "ALL";
  },
) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const search = (query.search ?? "").trim();
  const status = normalizeStatus(
    (query.status ?? query.branchStatus) as string | undefined,
  );
  const branchId = query.branchId;

  ensureAgencyAccess(context, agencyId);
  const where: Prisma.UserWhereInput = {
    agencyId,
    role: { code: RoleCode.AGENT },
    ...(status && status !== "ALL" ? { status } : {}),
    ...(branchId ? { branchId } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, agents] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        branch: true,
        agency: true,
        role: true,
      },
    }),
  ]);

  return parseListResponse(
    agents.map((agent) => ({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      status: agent.status,
      agencyId: agent.agencyId,
      branchId: agent.branchId,
      branchName: agent.branch?.name ?? null,
      agencyName: agent.agency?.name ?? null,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    })),
    page,
    limit,
    total,
  );
}

export async function getAgent(context: AuthContext, agentId: string) {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    include: { agency: true, branch: true, role: true },
  });
  if (!agent) {
    const error = new Error("Agent not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  if (!agent.agencyId) {
    const error = new Error("Agent does not belong to an agency") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "INVALID_REQUEST";
    throw error;
  }
  ensureAgencyAccess(context, agent.agencyId);
  return agent;
}

export async function createAgent(
  context: AuthContext,
  agencyId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    branchId?: string | null;
    password?: string;
    status?: RecordStatus;
  },
) {
  ensureAgencyAccess(context, agencyId);
  if (!data.firstName || !data.lastName || !data.email) {
    const error = new Error("Agent name and email are required") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "INVALID_REQUEST";
    throw error;
  }

  if (data.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
    });
    if (!branch || branch.agencyId !== agencyId) {
      const error = new Error(
        "Branch does not belong to this agency",
      ) as Error & { statusCode?: number; code?: string };
      error.statusCode = 400;
      error.code = "INVALID_REQUEST";
      throw error;
    }
  }

  const role = await prisma.role.findUnique({
    where: { code: RoleCode.AGENT },
  });
  if (!role) {
    const error = new Error("Agent role is not configured") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 500;
    error.code = "INTERNAL_SERVER_ERROR";
    throw error;
  }

  const email = data.email.trim().toLowerCase();
  const hasExplicitPassword = Boolean(data.password?.trim());
  const password = data.password?.trim() || randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        agencyId,
        branchId: data.branchId ?? null,
        roleId: role.id,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        phone: data.phone?.trim() || null,
        passwordHash,
        onboardingCompleted: true,
        status: data.status ?? RecordStatus.ACTIVE,
      },
      include: { role: true, agency: true, branch: true },
    });
    if (!hasExplicitPassword) {
      const token = randomBytes(32).toString("hex");
      await prisma.invitation.create({
        data: {
          userId: user.id,
          agencyId,
          branchId: data.branchId ?? null,
          roleId: role.id,
          invitedById: context.userId,
          email,
          firstName: user.firstName,
          lastName: user.lastName,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      void sendTeamInvitation({
        email,
        firstName: user.firstName,
        inviterName: `${context.firstName} ${context.lastName}`,
        agencyName: user.agency?.name ?? "your travel team",
        invitationUrl: `${environment.WEB_URL}/invite/${encodeURIComponent(token)}`,
      }).catch((error) => console.error("Team invitation email failed", error));
    } else {
      void sendTeamWelcome({
        email,
        firstName: user.firstName,
        inviterName: `${context.firstName} ${context.lastName}`,
        agencyName: user.agency?.name ?? "your travel team",
        loginUrl: `${environment.WEB_URL}/login`,
      }).catch((error) => console.error("Team welcome email failed", error));
    }
    return { ...user, invitationSent: !hasExplicitPassword };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = new Error("Agent email already exists") as Error & {
        statusCode?: number;
        code?: string;
      };
      duplicate.statusCode = 409;
      duplicate.code = "CONFLICT";
      throw duplicate;
    }
    throw error;
  }
}

export async function updateAgent(
  context: AuthContext,
  agentId: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    phone: string | null;
    branchId: string | null;
    status: RecordStatus;
  }>,
) {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    include: { agency: true, branch: true },
  });
  if (!agent) {
    const error = new Error("Agent not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  if (!agent.agencyId) {
    const error = new Error("Agent is not assigned to an agency") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "INVALID_REQUEST";
    throw error;
  }
  ensureAgencyAccess(context, agent.agencyId);

  if (data.branchId !== undefined && data.branchId !== null) {
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
    });
    if (!branch || branch.agencyId !== agent.agencyId) {
      const error = new Error(
        "Branch does not belong to this agency",
      ) as Error & { statusCode?: number; code?: string };
      error.statusCode = 400;
      error.code = "INVALID_REQUEST";
      throw error;
    }
  }

  return prisma.user.update({
    where: { id: agentId },
    data: {
      ...(data.firstName !== undefined
        ? { firstName: data.firstName.trim() }
        : {}),
      ...(data.lastName !== undefined
        ? { lastName: data.lastName.trim() }
        : {}),
      ...(data.phone !== undefined
        ? { phone: data.phone?.trim() || null }
        : {}),
      ...(data.branchId !== undefined
        ? { branchId: data.branchId ?? null }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    include: { agency: true, branch: true, role: true },
  });
}

export async function deactivateAgent(context: AuthContext, agentId: string) {
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent) {
    const error = new Error("Agent not found") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  if (!agent.agencyId) {
    const error = new Error("Agent is not assigned to an agency") as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = 400;
    error.code = "INVALID_REQUEST";
    throw error;
  }
  ensureAgencyAccess(context, agent.agencyId);
  return prisma.user.update({
    where: { id: agentId },
    data: { status: RecordStatus.INACTIVE },
  });
}

export const agencyListSchema = { page: 1, limit: 20 } as const;
