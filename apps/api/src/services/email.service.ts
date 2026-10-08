import { environment } from "../config/env.js";
import { emailLayout, emailButton, escapeHtml } from "./email-templates.js";
type EmailInput = { to: string; subject: string; text: string; html: string };

export async function sendEmail(input: EmailInput) {
  if (!environment.RESEND_API_KEY) {
    if (environment.NODE_ENV === "production")
      throw new Error("Email delivery is not configured");
    console.info(`[email:${input.subject}] ${input.to}\n${input.text}`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: environment.MAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
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
    subject: "Your Digol TravelOS password reset code",
    text: `Your password reset code is ${otp}. It expires in 10 minutes. Never share this code. If you did not request a reset, ignore this email.`,
    html: emailLayout(
      "Reset your password",
      `<p>We received a request to reset your Digol TravelOS password. Enter this one-time code to continue:</p><div style="padding:20px;background:#fbeaea;border:1px solid #f2cbcb;border-radius:10px;text-align:center;margin:24px 0"><span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#c62828">${escapeHtml(otp)}</span></div><p><strong>Expires in 10 minutes.</strong> Never share this code with anyone, including someone claiming to be support.</p>`,
      {
        eyebrow: "ACCOUNT SECURITY",
        preheader: "Your password reset code expires in 10 minutes.",
        footer:
          "If you did not request a password reset, ignore this email. Your password remains unchanged.",
      },
    ),
  });
}
export function sendRegistrationConfirmation(input: {
  email: string;
  firstName: string;
  verificationUrl: string;
}) {
  return sendEmail({
    to: input.email,
    subject: "Confirm your Digol TravelOS account",
    text: `Hi ${input.firstName}, welcome to Digol TravelOS. Confirm your email here: ${input.verificationUrl}. This link expires in 24 hours.`,
    html: emailLayout(
      `Welcome, ${input.firstName}`,
      `<p>Thank you for joining Digol TravelOS. Confirm your email address to secure your account and set up your travel business.</p>${emailButton("Confirm email address", input.verificationUrl)}<p style="font-size:12px;color:#647780">This verification link expires in 24 hours.</p>`,
      {
        eyebrow: "WELCOME ABOARD",
        preheader: "Verify your email to get your travel workspace ready.",
        footer:
          "If you did not create an account, you can safely ignore this email.",
      },
    ),
  });
}
export function sendEmailChangeConfirmation(input: {
  email: string;
  firstName: string;
  verificationUrl: string;
}) {
  return sendEmail({
    to: input.email,
    subject: "Confirm your new Digol TravelOS email address",
    text: `Hi ${input.firstName}, confirm your new email address here: ${input.verificationUrl}. The link expires in 24 hours. After confirmation, sign in again with this address.`,
    html: emailLayout(
      "Confirm your new email address",
      `<p>Hi ${escapeHtml(input.firstName)}, confirm this address to update your account. Your current email stays active until you confirm.</p>${emailButton("Confirm new email", input.verificationUrl)}<p>The link expires in 24 hours. After confirmation, all active sessions end and you will need to sign in again with this address.</p>`,
      {
        eyebrow: "ACCOUNT SECURITY",
        footer:
          "If you did not request this change, do not confirm it. Contact your agency administrator for assistance.",
      },
    ),
  });
}
export function sendTeamInvitation(input: {
  email: string;
  firstName: string;
  inviterName: string;
  agencyName: string;
  invitationUrl: string;
}) {
  return sendEmail({
    to: input.email,
    subject: `${input.inviterName} invited you to ${input.agencyName}`,
    text: `Hi ${input.firstName}, ${input.inviterName} invited you to join ${input.agencyName} on Digol TravelOS. Accept here: ${input.invitationUrl}. This invitation expires in 7 days.`,
    html: emailLayout(
      `Join ${input.agencyName}`,
      `<p>Hi ${escapeHtml(input.firstName)}, <strong>${escapeHtml(input.inviterName)}</strong> invited you to join <strong>${escapeHtml(input.agencyName)}</strong> on Digol TravelOS.</p><p>Accept the invitation, choose a secure password, and start coordinating bookings and travel operations with your team.</p>${emailButton("Accept invitation", input.invitationUrl)}<p style="font-size:12px;color:#647780">Your invitation expires in 7 days. Your access is determined by your agency administrator.</p>`,
      {
        eyebrow: "TEAM INVITATION",
        footer:
          "If you were not expecting this invitation, contact the inviting agency before accepting it.",
      },
    ),
  });
}
export function sendTeamWelcome(input: {
  email: string;
  firstName: string;
  inviterName: string;
  agencyName: string;
  loginUrl: string;
}) {
  return sendEmail({
    to: input.email,
    subject: `Your ${input.agencyName} team account is ready`,
    text: `Hi ${input.firstName}, ${input.inviterName} added you to ${input.agencyName}. Sign in here: ${input.loginUrl}. Use the password shared with you by your agency administrator.`,
    html: emailLayout(
      "Your workspace is ready",
      `<p>Hi ${escapeHtml(input.firstName)}, <strong>${escapeHtml(input.inviterName)}</strong> added you to the <strong>${escapeHtml(input.agencyName)}</strong> team.</p><p>Sign in using the password provided separately by your agency administrator. Once signed in, review your profile and assigned access.</p>${emailButton("Open your workspace", input.loginUrl)}`,
      {
        eyebrow: "TEAM ACCOUNT",
        footer:
          "For help signing in or changing your access, contact your agency administrator. Never share your password.",
      },
    ),
  });
}
