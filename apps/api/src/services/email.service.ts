import { environment } from "../config/env.js";

export async function sendPasswordResetOtp(email: string, otp: string) {
  if (!environment.RESEND_API_KEY) {
    if (environment.NODE_ENV === "production")
      throw new Error("Email delivery is not configured");
    console.info(`[password-reset] OTP for ${email}: ${otp}`);
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
      to: [email],
      subject: "Your A-One password reset code",
      text: `Your password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<p>Your A-One password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${otp}</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
    }),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}