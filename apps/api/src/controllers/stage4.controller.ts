import type { Request, Response } from "express";
import { z } from "zod";
import * as service from "../services/stage4.service.js";
import { sendError } from "../utils/api-response.js";

async function run(
  req: Request,
  res: Response,
  action: () => Promise<unknown>,
  status = 200,
) {
  try {
    return res.status(status).json({ success: true, data: await action() });
  } catch (error) {
    if (error instanceof z.ZodError)
      return sendError(
        res,
        400,
        "INVALID_REQUEST",
        "Request inputs are invalid",
      );
    const e = error as { statusCode?: number; code?: string };
    return sendError(
      res,
      e.statusCode ?? 500,
      e.code ?? "INTERNAL_SERVER_ERROR",
      error instanceof Error ? error.message : "Request failed",
    );
  }
}
const id = z.string().min(1);
export const notifications = (req: Request, res: Response) =>
  run(req, res, () =>
    req.method === "GET"
      ? service.listNotifications(req.auth!)
      : service.updatePreferences(
          req.auth!,
          z
            .object({
              inApp: z.boolean(),
              email: z.boolean(),
              sms: z.boolean(),
              whatsapp: z.boolean(),
            })
            .parse(req.body),
        ),
  );
export const preferences = (req: Request, res: Response) =>
  run(req, res, () => service.getPreferences(req.auth!));
export const markRead = (req: Request, res: Response) =>
  run(req, res, () =>
    service.markNotificationRead(req.auth!, id.parse(req.params.id)),
  );
export const requestCancellation = (req: Request, res: Response) =>
  run(
    req,
    res,
    () =>
      service.requestCancellation(
        req.auth!,
        id.parse(req.params.id),
        z.object({ reason: z.string().max(500).optional() }).parse(req.body)
          .reason,
      ),
    201,
  );
export const cancellationRequests = (req: Request, res: Response) =>
  run(req, res, () =>
    req.method === "GET"
      ? service.listCancellationRequests(req.auth!)
      : service.reviewCancellation(
          req.auth!,
          id.parse(req.params.id),
          z
            .object({
              approve: z.boolean(),
              note: z.string().max(500).optional(),
            })
            .parse(req.body),
        ),
  );
export const agencySettings = (req: Request, res: Response) =>
  run(req, res, () =>
    req.method === "GET"
      ? service.getAgencySettings(req.auth!)
      : service.updateAgencySettings(
          req.auth!,
          z
            .object({
              name: z.string().min(1).max(120),
              email: z.email().nullable().optional(),
              phone: z.string().max(40).nullable().optional(),
              brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
              logoUrl: z
                .string()
                .url()
                .refine(
                  (value) => value.startsWith("https://"),
                  "Logo URL must use HTTPS",
                )
                .max(1000)
                .nullable()
                .optional(),
              currency: z.enum(["INR", "USD", "EUR", "GBP"]),
              defaultFare: z.number().min(0).max(1_000_000),
            })
            .parse(req.body),
        ),
  );
export const auditLogs = (req: Request, res: Response) =>
  run(req, res, () => service.listAuditLogs(req.auth!));
export const subscription = (req: Request, res: Response) =>
  run(req, res, () =>
    req.method === "GET"
      ? service.getSubscription(req.auth!)
      : service.requestPlan(
          req.auth!,
          z
            .object({
              planName: z.string().min(1).max(80),
              price: z.number().min(0).max(1_000_000),
            })
            .parse(req.body),
        ),
  );
export const adminSubscription = (req: Request, res: Response) =>
  run(req, res, () =>
    service.adminSubscription(
      req.auth!,
      id.parse(req.params.agencyId),
      z
        .object({
          planName: z.string().min(1).max(80),
          price: z.number().min(0).max(1_000_000),
          status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]),
          trialEndsAt: z.iso.datetime().nullable().optional(),
          periodEndsAt: z.iso.datetime().nullable().optional(),
        })
        .parse(req.body),
    ),
  );
export const adminSubscriptionGet = (req: Request, res: Response) =>
  run(req, res, () =>
    service.getAdminSubscription(req.auth!, id.parse(req.params.agencyId)),
  );
export const invoices = (req: Request, res: Response) =>
  run(
    req,
    res,
    () =>
      req.method === "GET"
        ? service.invoices(
            req.auth!,
            typeof req.query.agencyId === "string"
              ? req.query.agencyId
              : undefined,
          )
        : service.createInvoice(
            req.auth!,
            z
              .object({
                agencyId: id,
                description: z.string().min(1).max(300),
                amount: z.number().positive().max(1_000_000),
                dueAt: z.iso.datetime().optional(),
              })
              .parse(req.body),
          ),
    req.method === "POST" ? 201 : 200,
  );
export const markInvoicePaid = (req: Request, res: Response) =>
  run(req, res, () => {
    const body = z
      .object({
        method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "UPI", "OTHER"]),
        reference: z.string().max(200).optional(),
      })
      .parse(req.body);
    return service.markInvoicePaid(
      req.auth!,
      id.parse(req.params.id),
      body.method,
      body.reference,
    );
  });
