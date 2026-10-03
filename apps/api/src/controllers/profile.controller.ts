import type { Request, Response } from "express";
import { z } from "zod";
import { sendError } from "../utils/api-response.js";
import { getProfile, isEmailConflict, requestEmailChange, updateProfile } from "../services/profile.service.js";

const optionalDetail = z.string().trim().max(160).nullable().optional();
const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(80).optional(),
  lastName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  agency: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    address: optionalDetail, city: optionalDetail, state: optionalDetail, country: optionalDetail,
  }).optional(),
}).strict();
const emailSchema = z.object({ email: z.email(), password: z.string().min(1) });

function handleError(response: Response, error: unknown) {
  const item = error as { statusCode?: number; code?: string };
  return sendError(response, isEmailConflict(error) ? 409 : item.statusCode ?? 500,
    isEmailConflict(error) ? "CONFLICT" : item.code ?? "PROFILE_FAILED",
    isEmailConflict(error) ? "This email address is already in use" : error instanceof Error ? error.message : "Unable to update profile");
}

export async function profile(request: Request, response: Response) {
  try {
    return response.json({ success: true, data: await getProfile(request.auth!) });
  } catch (error) { return handleError(response, error); }
}

export async function saveProfile(request: Request, response: Response) {
  const parsed = profileSchema.safeParse(request.body);
  if (!parsed.success) return sendError(response, 400, "INVALID_REQUEST", "Check the profile fields and try again");
  try {
    return response.json({ success: true, data: await updateProfile(request.auth!, parsed.data) });
  } catch (error) { return handleError(response, error); }
}

export async function changeEmailRequest(request: Request, response: Response) {
  const parsed = emailSchema.safeParse(request.body);
  if (!parsed.success) return sendError(response, 400, "INVALID_REQUEST", "Enter a valid email and your current password");
  try {
    return response.json({ success: true, data: await requestEmailChange(request.auth!, parsed.data.email, parsed.data.password) });
  } catch (error) { return handleError(response, error); }
}
