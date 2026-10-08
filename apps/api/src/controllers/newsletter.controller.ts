import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { environment } from "../config/env.js";
import {
  emailLayout,
  emailButton,
  escapeHtml,
} from "../services/email-templates.js";
import { sendEmail } from "../services/email.service.js";
import { sendError } from "../utils/api-response.js";

const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const emailSchema = z.object({ email: z.email().max(254) });
const tokenSchema = z.object({ token: z.string().min(40) });

export async function subscribe(request: Request, response: Response) {
  const parsed = emailSchema.safeParse(request.body);
  if (!parsed.success)
    return sendError(
      response,
      400,
      "INVALID_REQUEST",
      "Enter a valid email address",
    );
  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });
  if (existing?.confirmedAt && !existing.unsubscribedAt)
    return response.json({ success: true, data: { sent: true } });
  const token = randomBytes(32).toString("hex");
  const tokenHash = hash(token);
  const record = await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: { tokenHash, confirmedAt: null, unsubscribedAt: null },
    create: { email, tokenHash },
  });
  try {
    const link = `${environment.WEB_URL}/newsletter/confirm?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: email,
      subject: "Confirm your Digol TravelOS updates",
      text: `Confirm your newsletter subscription: ${link}\n\nIf you did not sign up, ignore this message.`,
      html: emailLayout(
        "Travel operations, made clearer",
        `<p>Confirm your email to receive Digol TravelOS product updates and practical tips for your travel business.</p>${emailButton("Confirm subscription", link)}`,
        {
          eyebrow: "STAY IN THE LOOP",
          footer:
            "If you did not subscribe, ignore this email. We will only send updates after you confirm.",
        },
      ),
    });
  } catch {
    await prisma.newsletterSubscriber.deleteMany({
      where: { id: record.id, confirmedAt: null },
    });
    return sendError(
      response,
      503,
      "EMAIL_UNAVAILABLE",
      "We could not send a confirmation email right now",
    );
  }
  return response.json({ success: true, data: { sent: true } });
}

export async function confirm(request: Request, response: Response) {
  const parsed = tokenSchema.safeParse(request.body);
  if (!parsed.success)
    return sendError(
      response,
      400,
      "INVALID_REQUEST",
      "Invalid confirmation link",
    );
  const record = await prisma.newsletterSubscriber.findUnique({
    where: { tokenHash: hash(parsed.data.token) },
  });
  if (!record || record.unsubscribedAt)
    return sendError(
      response,
      400,
      "INVALID_TOKEN",
      "This link is invalid or expired",
    );
  if (!record.confirmedAt)
    await prisma.newsletterSubscriber.update({
      where: { id: record.id },
      data: { confirmedAt: new Date() },
    });
  const unsubscribeUrl = `${environment.WEB_URL}/newsletter/unsubscribe?token=${encodeURIComponent(parsed.data.token)}`;
  if (!record.confirmedAt)
    void sendEmail({
      to: record.email,
      subject: "You’re subscribed to Digol TravelOS",
      text: `You’re subscribed. To unsubscribe at any time: ${unsubscribeUrl}`,
      html: emailLayout(
        "Welcome aboard",
        `<p>Your subscription to Digol TravelOS updates is confirmed. Look out for product news and useful tips for smoother travel operations.</p><p>Thank you for joining us.</p>`,
        {
          eyebrow: "SUBSCRIPTION CONFIRMED",
          footer: `You subscribed to Digol TravelOS updates. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#c62828">Unsubscribe at any time</a>.`,
        },
      ),
    }).catch((error) =>
      console.error("Newsletter welcome email failed", error),
    );
  return response.json({ success: true, data: { confirmed: true } });
}

export async function unsubscribe(request: Request, response: Response) {
  const parsed = tokenSchema.safeParse(request.body);
  if (!parsed.success)
    return sendError(
      response,
      400,
      "INVALID_REQUEST",
      "Invalid unsubscribe link",
    );
  await prisma.newsletterSubscriber.updateMany({
    where: { tokenHash: hash(parsed.data.token) },
    data: { unsubscribedAt: new Date() },
  });
  return response.json({ success: true, data: { unsubscribed: true } });
}
