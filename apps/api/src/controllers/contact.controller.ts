import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { environment } from "../config/env.js";
import { emailLayout, escapeHtml } from "../services/email-templates.js";
import { sendEmail } from "../services/email.service.js";
import { sendError } from "../utils/api-response.js";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(5000),
  website: z.string().optional(),
});
export async function sendContactInquiry(request: Request, response: Response) {
  const parsed = schema.safeParse(request.body);
  if (!parsed.success)
    return sendError(
      response,
      400,
      "INVALID_REQUEST",
      "Complete every field with valid details",
    );
  if (parsed.data.website)
    return response.json({ success: true, data: { received: true } });
  const { name, email, subject, message } = parsed.data;
  const inquiry = await prisma.contactInquiry.create({
    data: { name, email: email.toLowerCase(), subject, message },
  });
  if (environment.CONTACT_EMAIL) {
    void sendEmail({
      to: environment.CONTACT_EMAIL,
      subject: `Digol TravelOS contact: ${subject}`,
      text: `New contact inquiry ${inquiry.id}\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
      html: emailLayout(
        "New contact inquiry",
        `<p><strong>${escapeHtml(name)}</strong> sent a message through the website.</p><p>Reply to: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br>Reference: ${escapeHtml(inquiry.id)}</p><div style="border-left:3px solid #c62828;padding:16px 20px;background:#f7f9fa;margin-top:22px"><p><strong>${escapeHtml(subject)}</strong></p><p style="margin:0">${escapeHtml(message).replace(/\n/g, "<br>")}</p></div>`,
        {
          eyebrow: "WEBSITE CONTACT",
          footer:
            "This message was submitted through the Digol TravelOS contact form. Reply directly to the sender’s email address.",
        },
      ),
    }).catch((error) => console.error("Contact notification failed", error));
  }
  return response.json({ success: true, data: { received: true } });
}
