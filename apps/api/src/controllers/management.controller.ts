import type { Request, Response } from "express";
import { z } from "zod";
import { RecordStatus } from "@prisma/client";
import {
  createAgency,
  createAgent,
  createBranch,
  deactivateAgency,
  deactivateAgent,
  deactivateBranch,
  getAgency,
  getAgent,
  getBranch,
  getDashboardSummary,
  listAgencies,
  listAgents,
  listBranches,
  normalizeStatus,
  updateAgency,
  updateAgent,
  updateBranch,
} from "../services/management.service.js";
import { sendError } from "../utils/api-response.js";

const idParam = z.string().min(1);
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
});

function handleServiceError(response: Response, error: unknown) {
  const status = error && typeof error === "object" && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 500;
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "INTERNAL_SERVER_ERROR";
  const message = error instanceof Error ? error.message : "Request failed";
  return sendError(response, status || 500, code || "INTERNAL_SERVER_ERROR", message);
}

export async function getSummary(request: Request, response: Response) {
  try {
    const result = await getDashboardSummary(request.auth!);
    return response.json(result);
  } catch (error) {
    return handleServiceError(response, error);
  }
}

export async function listAgenciesController(request: Request, response: Response) {
  try {
    const query = querySchema.parse(request.query);
    const result = await listAgencies(request.auth!, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: normalizeStatus(query.status),
    });
    return response.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid pagination or filter parameters");
    return handleServiceError(response, error);
  }
}

export async function getAgencyController(request: Request, response: Response) {
  try {
    const agencyId = idParam.parse(request.params.id);
    const agency = await getAgency(request.auth!, agencyId);
    return response.json({ success: true, data: agency });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid agency id");
    return handleServiceError(response, error);
  }
}

export async function createAgencyController(request: Request, response: Response) {
  try {
    const payload = z.object({
      name: z.string().min(2),
      slug: z.string().min(2),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }).parse(request.body);
    const agency = await createAgency(request.auth!, {
      name: payload.name,
      slug: payload.slug,
      email: payload.email || null,
      phone: payload.phone || null,
      address: payload.address || null,
      city: payload.city || null,
      state: payload.state || null,
      country: payload.country || null,
      status: payload.status ? RecordStatus[payload.status as keyof typeof RecordStatus] : undefined,
    });
    return response.status(201).json({ success: true, data: agency });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Agency inputs are invalid");
    return handleServiceError(response, error);
  }
}

export async function updateAgencyController(request: Request, response: Response) {
  try {
    const agencyId = idParam.parse(request.params.id);
    const payload = z.object({
      name: z.string().min(2).optional(),
      slug: z.string().min(2).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }).parse(request.body);
    const agency = await updateAgency(request.auth!, agencyId, {
      name: payload.name,
      slug: payload.slug,
      email: payload.email || null,
      phone: payload.phone || null,
      address: payload.address || null,
      city: payload.city || null,
      state: payload.state || null,
      country: payload.country || null,
      status: payload.status ? RecordStatus[payload.status as keyof typeof RecordStatus] : undefined,
    });
    return response.json({ success: true, data: agency });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Agency update payload is invalid");
    return handleServiceError(response, error);
  }
}

export async function deleteAgencyController(request: Request, response: Response) {
  try {
    const agencyId = idParam.parse(request.params.id);
    const agency = await deactivateAgency(request.auth!, agencyId);
    return response.json({ success: true, data: agency });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid agency id");
    return handleServiceError(response, error);
  }
}

export async function listBranchesController(request: Request, response: Response) {
  try {
    const agencyId = idParam.parse(request.params.agencyId);
    const query = querySchema.extend({ status: z.string().optional() }).parse(request.query);
    const result = await listBranches(request.auth!, agencyId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: normalizeStatus(query.status),
    });
    return response.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid branch list parameters");
    return handleServiceError(response, error);
  }
}

export async function getBranchController(request: Request, response: Response) {
  try {
    const branchId = idParam.parse(request.params.id);
    const branch = await getBranch(request.auth!, branchId);
    return response.json({ success: true, data: branch });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid branch id");
    return handleServiceError(response, error);
  }
}

export async function createBranchController(request: Request, response: Response) {
  try {
    const agencyId = idParam.parse(request.params.agencyId);
    const payload = z.object({
      name: z.string().min(2),
      code: z.string().min(2),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }).parse(request.body);
    const branch = await createBranch(request.auth!, agencyId, {
      name: payload.name,
      code: payload.code,
      email: payload.email || null,
      phone: payload.phone || null,
      address: payload.address || null,
      city: payload.city || null,
      state: payload.state || null,
      country: payload.country || null,
      status: payload.status ? RecordStatus[payload.status as keyof typeof RecordStatus] : undefined,
    });
    return response.status(201).json({ success: true, data: branch });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Branch inputs are invalid");
    return handleServiceError(response, error);
  }
}

export async function updateBranchController(request: Request, response: Response) {
  try {
    const branchId = idParam.parse(request.params.id);
    const payload = z.object({
      name: z.string().min(2).optional(),
      code: z.string().min(2).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }).parse(request.body);
    const branch = await updateBranch(request.auth!, branchId, {
      name: payload.name,
      code: payload.code,
      email: payload.email || null,
      phone: payload.phone || null,
      address: payload.address || null,
      city: payload.city || null,
      state: payload.state || null,
      country: payload.country || null,
      status: payload.status ? RecordStatus[payload.status as keyof typeof RecordStatus] : undefined,
    });
    return response.json({ success: true, data: branch });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Branch update payload is invalid");
    return handleServiceError(response, error);
  }
}

export async function deleteBranchController(request: Request, response: Response) {
  try {
    const branchId = idParam.parse(request.params.id);
    const branch = await deactivateBranch(request.auth!, branchId);
    return response.json({ success: true, data: branch });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid branch id");
    return handleServiceError(response, error);
  }
}

export async function listAgentsController(request: Request, response: Response) {
  try {
    const agencyId = idParam.parse(request.params.agencyId);
    const query = querySchema.extend({
      branchId: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.query);
    const result = await listAgents(request.auth!, agencyId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: normalizeStatus(query.status),
      branchId: query.branchId,
    });
    return response.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid agent list parameters");
    return handleServiceError(response, error);
  }
}

export async function getAgentController(request: Request, response: Response) {
  try {
    const agentId = idParam.parse(request.params.id);
    const agent = await getAgent(request.auth!, agentId);
    return response.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid agent id");
    return handleServiceError(response, error);
  }
}

export async function createAgentController(request: Request, response: Response) {
  try {
    const agencyId = idParam.parse(request.params.agencyId);
    const payload = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      branchId: z.string().optional(),
      password: z.string().min(8).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }).parse(request.body);
    const agent = await createAgent(request.auth!, agencyId, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone || null,
      branchId: payload.branchId || null,
      password: payload.password,
      status: payload.status ? RecordStatus[payload.status as keyof typeof RecordStatus] : undefined,
    });
    return response.status(201).json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Agent details are invalid");
    return handleServiceError(response, error);
  }
}

export async function updateAgentController(request: Request, response: Response) {
  try {
    const agentId = idParam.parse(request.params.id);
    const payload = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
      branchId: z.string().nullable().optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }).parse(request.body);
    const agent = await updateAgent(request.auth!, agentId, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone || null,
      branchId: payload.branchId ?? undefined,
      status: payload.status ? RecordStatus[payload.status as keyof typeof RecordStatus] : undefined,
    });
    return response.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Agent update payload is invalid");
    return handleServiceError(response, error);
  }
}

export async function deleteAgentController(request: Request, response: Response) {
  try {
    const agentId = idParam.parse(request.params.id);
    const agent = await deactivateAgent(request.auth!, agentId);
    return response.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof z.ZodError) return sendError(response, 400, "INVALID_REQUEST", "Invalid agent id");
    return handleServiceError(response, error);
  }
}
