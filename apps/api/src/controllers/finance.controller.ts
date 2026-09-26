import type { Request, Response } from "express";
import { z } from "zod";
import * as service from "../services/finance.service.js";
import { sendError } from "../utils/api-response.js";
import { sendBookingNotifications } from "../services/stage4.service.js";

async function run(
  req: Request,
  res: Response,
  action: () => Promise<unknown>,
) {
  try {
    return res.json({ success: true, data: await action() });
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
const method = z.enum(["CASH", "BANK_TRANSFER", "CARD", "UPI", "OTHER"]);
const money = z.number().positive().multipleOf(0.01);
export const settings = (req: Request, res: Response) =>
  run(req, res, () =>
    req.method === "GET"
      ? service.getSettings(
          req.auth!,
          typeof req.query.agencyId === "string"
            ? req.query.agencyId
            : undefined,
        )
      : service.saveSettings(
          req.auth!,
          z
            .object({
              agencyId: z.string().min(1).optional(),
              gstRate: z.number().min(0).max(100),
              gstAfterDiscount: z.boolean(),
              commissionType: z.enum(["FIXED", "PERCENTAGE"]),
              commissionValue: z.number().min(0),
              tiers: z.array(
                z.object({
                  hoursBeforeDeparture: z.number().min(0),
                  feePercent: z.number().min(0).max(100),
                }),
              ),
            })
            .parse(req.body),
        ),
  );
export const bookingFinance = (req: Request, res: Response) =>
  run(req, res, () =>
    service.getBookingFinanceByPnr(
      req.auth!,
      z.string().min(1).parse(req.params.pnr),
    ),
  );
export const payment = (req: Request, res: Response) =>
  run(req, res, () =>
    service.recordPayment(
      req.auth!,
      z.string().min(1).parse(req.params.id),
      z
        .object({
          amount: money,
          method,
          reference: z.string().max(200).optional(),
        })
        .parse(req.body),
    ),
  );
export const cancellation = (req: Request, res: Response) =>
  run(req, res, async () => {
    const result = await service.cancelBooking(
      req.auth!,
      z.string().min(1).parse(req.params.id),
      z.object({ reason: z.string().max(500).optional() }).parse(req.body)
        .reason,
    );
    void sendBookingNotifications(
      result.bookingId,
      "CANCELLATION_APPROVED",
    ).catch((error) =>
      console.error("Cancellation notification failed", error),
    );
    return result;
  });
export const refund = (req: Request, res: Response) =>
  run(req, res, () =>
    service.recordRefund(
      req.auth!,
      z.string().min(1).parse(req.params.id),
      z
        .object({
          amount: money,
          method,
          reference: z.string().max(200).optional(),
        })
        .parse(req.body),
    ),
  );
export const settlement = (req: Request, res: Response) =>
  run(req, res, () =>
    service.postSettlement(
      req.auth!,
      z
        .object({
          party: z.enum(["AGENT", "OPERATOR"]),
          partyId: z.string().min(1),
          amount: money,
          method,
          reference: z.string().max(200).optional(),
        })
        .parse(req.body),
    ),
  );
export const ledger = (req: Request, res: Response) =>
  run(req, res, () => service.listLedger(req.auth!));
function reportFilters(req: Request) {
  return {
    agencyId:
      typeof req.query.agencyId === "string" ? req.query.agencyId : undefined,
    branchId:
      typeof req.query.branchId === "string" ? req.query.branchId : undefined,
    agentId:
      typeof req.query.agentId === "string" ? req.query.agentId : undefined,
    tripId: typeof req.query.tripId === "string" ? req.query.tripId : undefined,
  };
}
function reportDate(req: Request, name: "from" | "to") {
  const value = req.query[name];
  return value === undefined ? undefined : z.iso.date().parse(value);
}
export const reports = (req: Request, res: Response) =>
  run(req, res, () =>
    service.getReports(
      req.auth!,
      reportDate(req, "from"),
      reportDate(req, "to"),
      reportFilters(req),
    ),
  );
export async function exportReport(req: Request, res: Response) {
  try {
    const report = await service.getReports(
      req.auth!,
      reportDate(req, "from"),
      reportDate(req, "to"),
      reportFilters(req),
    );
    const rows = [
      [
        "PNR",
        "Created",
        "Status",
        "Amount",
        "GST",
        "Commission",
        "Cancellation fee",
        "Refund eligible",
        "Refund paid",
      ],
      ...report.bookings.map((b) => [
        b.pnr,
        b.createdAt.toISOString(),
        b.status,
        Number(b.totalAmount).toFixed(2),
        Number(b.taxAmount).toFixed(2),
        Number(b.commissionAmount).toFixed(2),
        Number(b.cancellation?.feeAmount ?? 0).toFixed(2),
        Number(b.cancellation?.eligibleRefund ?? 0).toFixed(2),
        b.refunds
          .reduce((sum, item) => sum + Number(item.amount), 0)
          .toFixed(2),
      ]),
    ];
    const kind = req.params.format;
    if (kind === "excel") {
      const body = rows
        .map((row) =>
          row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=finance-report.csv",
      );
      return res.send(`\uFEFF${body}`);
    }
    if (kind !== "pdf")
      return sendError(
        res,
        400,
        "INVALID_FORMAT",
        "Export format must be excel or pdf",
      );
    const lines = rows.map((row) => row.join("  |  ").slice(0, 110));
    const pages = Array.from(
      { length: Math.max(1, Math.ceil(lines.length / 48)) },
      (_, page) => lines.slice(page * 48, (page + 1) * 48),
    );
    const pageIds = pages.map((_, i) => 4 + i * 2);
    const objects = [
      `<< /Type /Catalog /Pages 2 0 R >>`,
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
      `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    ];
    for (let page = 0; page < pages.length; page++) {
      const pageId = 4 + page * 2;
      const streamId = pageId + 1;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
      );
      const stream = `${pages[page]!.map((line, index) => `BT /F1 8 Tf 36 ${800 - index * 16} Td (${line.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, " ")}) Tj ET`).join("\n")}\n`;
      objects.push(
        `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
      );
    }
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
      .join(
        "",
      )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=finance-report.pdf",
    );
    return res.send(Buffer.from(pdf));
  } catch (error) {
    if (error instanceof z.ZodError)
      return sendError(
        res,
        400,
        "INVALID_REQUEST",
        "Report dates must use YYYY-MM-DD",
      );
    const e = error as { statusCode?: number; code?: string };
    return sendError(
      res,
      e.statusCode ?? 500,
      e.code ?? "INTERNAL_SERVER_ERROR",
      error instanceof Error ? error.message : "Export failed",
    );
  }
}
