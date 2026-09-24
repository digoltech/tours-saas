import { environment } from "../config/env.js";

type EmailInput = { to: string; subject: string; text: string; html: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function layout(title: string, content: string) {
  return `<div style="background:#f5f7f6;padding:40px 16px;font-family:Arial,sans-serif;color:#15212b"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e3e9e7;border-radius:16px;padding:36px"><div style="font-size:18px;font-weight:700;color:#102a36;margin-bottom:28px">A-One <span style="color:#c62828">Tours &amp; Travels</span></div><h1 style="font-size:24px;line-height:1.2;margin:0 0 16px">${title}</h1>${content}<p style="margin:30px 0 0;color:#829199;font-size:12px;line-height:1.5">If you did not expect this email, you can safely ignore it.</p></div></div>`;
}

export async function sendEmail(input: EmailInput) {
  if (!environment.RESEND_API_KEY) {
    if (environment.NODE_ENV === "production") throw new Error("Email delivery is not configured");
    console.info(`[email:${input.subject}] ${input.to}\n${input.text}`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${environment.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: environment.MAIL_FROM, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Resend delivery failed", detail);
    throw new Error("Email delivery failed");
  }
}

export function sendPasswordResetOtp(email: string, otp: string) {
  return sendEmail({
    to: email,
    subject: "Your A-One password reset code",
    text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
    html: layout("Reset your password", `<p>Your one-time password reset code is:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#c62828">${escapeHtml(otp)}</p><p>This code expires in 10 minutes.</p>`),
  });
}

export function sendRegistrationConfirmation(input: { email: string; firstName: string; agencyName: string; verificationUrl: string }) {
  const firstName = escapeHtml(input.firstName); const agencyName = escapeHtml(input.agencyName);
  return sendEmail({
    to: input.email,
    subject: "Confirm your A-One Tours account",
    text: `Hi ${input.firstName}, welcome to ${input.agencyName}. Confirm your email here: ${input.verificationUrl}`,
    html: layout(`Welcome, ${firstName}`, `<p>Your ${agencyName} workspace is ready. Confirm your email address to keep your account secure.</p><p style="margin:26px 0"><a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;background:#c62828;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">Confirm email address</a></p><p style="font-size:12px;color:#64727c">This link expires in 24 hours.</p>`),
  });
}

export function sendTeamInvitation(input: { email: string; firstName: string; inviterName: string; agencyName: string; invitationUrl: string }) {
  const firstName = escapeHtml(input.firstName); const inviterName = escapeHtml(input.inviterName); const agencyName = escapeHtml(input.agencyName);
  return sendEmail({
    to: input.email,
    subject: `${input.inviterName} invited you to ${input.agencyName}`,
    text: `Hi ${input.firstName}, ${input.inviterName} invited you to join ${input.agencyName} on A-One Tours & Travels. Accept your invitation here: ${input.invitationUrl}`,
    html: layout(`You are invited, ${firstName}`, `<p><strong>${inviterName}</strong> invited you to join <strong>${agencyName}</strong> on A-One Tours &amp; Travels.</p><p>Set your password to accept the invitation and start managing travel operations with the team.</p><p style="margin:26px 0"><a href="${escapeHtml(input.invitationUrl)}" style="display:inline-block;background:#c62828;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">Accept invitation</a></p><p style="font-size:12px;color:#64727c">This invitation expires in 7 days.</p>`),
  });
}

export function sendTeamWelcome(input: { email: string; firstName: string; inviterName: string; agencyName: string; loginUrl: string }) {
  const firstName = escapeHtml(input.firstName); const inviterName = escapeHtml(input.inviterName); const agencyName = escapeHtml(input.agencyName);
  return sendEmail({
    to: input.email,
    subject: `Your ${input.agencyName} team account is ready`,
    text: `Hi ${input.firstName}, ${input.inviterName} added you to ${input.agencyName}. Sign in here: ${input.loginUrl}`,
    html: layout(`Welcome to ${agencyName}`, `<p>Hi ${firstName}, ${inviterName} added you to the team on A-One Tours &amp; Travels.</p><p>Your account is ready. Use the password shared with you by your workspace administrator.</p><p style="margin:26px 0"><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#c62828;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">Open workspace</a></p>`),
  });
}
