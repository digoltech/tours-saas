import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { sendError } from "../utils/api-response.js";
import * as service from "../services/user-documents.service.js";
export const userDocumentsRouter = Router();
userDocumentsRouter.use("/agents", authenticate);
async function run(response: Response, work: () => Promise<unknown>) {
  response.setHeader("Cache-Control", "private, no-store");
  try {
    return response.json({ success: true, data: await work() });
  } catch (error) {
    if (error instanceof z.ZodError)
      return sendError(
        response,
        400,
        "INVALID_REQUEST",
        "Check the document or personal information fields",
      );
    const item = error as { statusCode?: number; code?: string };
    return sendError(
      response,
      item.statusCode ?? 500,
      item.code ?? "REQUEST_FAILED",
      error instanceof Error
        ? error.message
        : "Unable to save user information",
    );
  }
}
const id = (request: Request, key = "id") =>
  z.string().min(1).parse(request.params[key]);
userDocumentsRouter.get(
  "/agents/:id/documents",
  requirePermission("agent:read"),
  (r, s) => run(s, () => service.listUserDocuments(r.auth!, id(r))),
);
userDocumentsRouter.get(
  "/agents/:id/documents/:documentId",
  requirePermission("agent:read"),
  (r, s) =>
    run(s, () => service.readUserDocument(r.auth!, id(r), id(r, "documentId"))),
);
const upload = z
  .object({
    label: z.string().trim().min(2).max(100),
    documentType: z.enum(["IDENTITY", "ADDRESS", "EMPLOYMENT", "OTHER"]),
    fileName: z.string().trim().min(1).max(150),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    base64: z.string().max(1398104),
  })
  .strict();
userDocumentsRouter.post(
  "/agents/:id/documents",
  requirePermission("agent:update"),
  (r, s) =>
    run(s, () =>
      service.uploadUserDocument(r.auth!, id(r), upload.parse(r.body)),
    ),
);
userDocumentsRouter.delete(
  "/agents/:id/documents/:documentId",
  requirePermission("agent:update"),
  (r, s) =>
    run(s, () =>
      service.deleteUserDocument(r.auth!, id(r), id(r, "documentId")),
    ),
);
const text = z.string().trim().max(160).nullable().optional();
const personal = z
  .object({
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return (
          Number.isFinite(date.getTime()) &&
          date.toISOString().slice(0, 10) === value &&
          date <= new Date()
        );
      }, "Enter a valid date of birth")
      .nullable()
      .optional(),
    gender: z
      .enum(["Female", "Male", "Other", "Prefer not to say"])
      .nullable()
      .optional(),
    jobTitle: text,
    address: z.string().trim().max(500).nullable().optional(),
    city: text,
    state: text,
    country: text,
    emergencyContactName: text,
    emergencyContactPhone: z
      .string()
      .regex(/^\+?\d{7,15}$/)
      .nullable()
      .optional(),
  })
  .strict();
userDocumentsRouter.patch(
  "/agents/:id/personal-details",
  requirePermission("agent:update"),
  (r, s) =>
    run(s, () =>
      service.savePersonalDetails(r.auth!, id(r), personal.parse(r.body)),
    ),
);
