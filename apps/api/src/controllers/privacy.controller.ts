import type { Request, Response } from "express";
import { z } from "zod";
import * as privacy from "../services/privacy.service.js";
import { sendError } from "../utils/api-response.js";

const type = z.enum(["ACCESS", "ERASURE"]);
const publicRequest = z.object({
  type,
  subjectName: z.string().trim().min(2).max(120),
  contactEmail: z.email().optional(),
  contactPhone: z.string().trim().min(7).max(30).optional(),
  bookingPnr: z.string().trim().min(4).max(40),
  reason: z.string().trim().max(1000).optional(),
}).refine((value) => value.contactEmail || value.contactPhone, { message: "Email or phone is required" });

async function run(response: Response, action: () => Promise<unknown>, status = 200) {
  try { return response.status(status).json({ success: true, data: await action() }); }
  catch (error) {
    const item = error as { statusCode?: number };
    return sendError(response, item.statusCode ?? 500, "PRIVACY_REQUEST_FAILED", item.statusCode ? "Unable to process this request" : "Internal server error");
  }
}

export function publicSubmit(request: Request, response: Response) {
  const parsed = publicRequest.safeParse(request.body);
  if (!parsed.success) return sendError(response, 400, "INVALID_REQUEST", "Enter your name, booking reference, and email or phone");
  return run(response, () => privacy.submitPublicRequest(parsed.data), 202);
}

export function staffSubmit(request: Request, response: Response) {
  const parsed = z.object({ type, reason: z.string().trim().max(1000).optional() }).safeParse(request.body);
  if (!parsed.success) return sendError(response, 400, "INVALID_REQUEST", "Invalid privacy request");
  return run(response, () => privacy.submitStaffRequest(request.auth!, parsed.data.type, parsed.data.reason), 201);
}

export const list = (request: Request, response: Response) => run(response, () => privacy.listRequests(request.auth!));

export function review(request: Request, response: Response) {
  const parsed = z.object({ action: z.enum(["VERIFY", "REJECT", "RETAIN", "COMPLETE"]), note: z.string().trim().min(10).max(2000) }).safeParse(request.body);
  const id = z.string().min(1).safeParse(request.params.id);
  if (!parsed.success || !id.success) return sendError(response, 400, "INVALID_REQUEST", "A review action and note are required");
  return run(response, () => privacy.reviewRequest(request.auth!, id.data, parsed.data.action, parsed.data.note));
}

export async function exportData(request: Request, response: Response) {
  const id = z.string().min(1).safeParse(request.params.id);
  if (!id.success) return sendError(response, 400, "INVALID_REQUEST", "Invalid request identifier");
  try {
    const result = await privacy.exportRequest(request.auth!, id.data);
    response.setHeader("Content-Disposition", `attachment; filename="privacy-${id.data}.json"`);
    return response.json(result);
  } catch (error) {
    const item = error as { statusCode?: number };
    return sendError(response, item.statusCode ?? 500, "PRIVACY_EXPORT_FAILED", "Unable to export this request");
  }
}
