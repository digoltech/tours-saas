import "dotenv/config";
import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url().optional(),
    DIRECT_URL: z.string().url().optional(),
    JWT_SECRET: z.string().min(32),
    WEB_URL: z.string().url().default("http://localhost:3000"),
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().min(3).default("onboarding@resend.dev"),
    SMS_PROVIDER_URL: z.string().url().optional(),
    SMS_PROVIDER_TOKEN: z.string().optional(),
    WHATSAPP_PROVIDER_URL: z.string().url().optional(),
    WHATSAPP_PROVIDER_TOKEN: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") return;
    for (const [key, candidate] of [
      ["DATABASE_URL", value.DATABASE_URL],
      ["DIRECT_URL", value.DIRECT_URL],
      ["RESEND_API_KEY", value.RESEND_API_KEY],
    ] as const) {
      if (!candidate)
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required in production`,
        });
    }
    if (!value.WEB_URL.startsWith("https://"))
      context.addIssue({
        code: "custom",
        path: ["WEB_URL"],
        message: "WEB_URL must use HTTPS in production",
      });
    if (
      value.MAIL_FROM.includes("resend.dev") ||
      value.MAIL_FROM.includes("your-verified-domain")
    )
      context.addIssue({
        code: "custom",
        path: ["MAIL_FROM"],
        message: "MAIL_FROM must use a verified production sender domain",
      });
    if (Boolean(value.SMS_PROVIDER_URL) !== Boolean(value.SMS_PROVIDER_TOKEN))
      context.addIssue({
        code: "custom",
        path: ["SMS_PROVIDER_TOKEN"],
        message: "Configure both SMS provider URL and token",
      });
    if (
      Boolean(value.WHATSAPP_PROVIDER_URL) !==
      Boolean(value.WHATSAPP_PROVIDER_TOKEN)
    )
      context.addIssue({
        code: "custom",
        path: ["WHATSAPP_PROVIDER_TOKEN"],
        message: "Configure both WhatsApp provider URL and token",
      });
    for (const [key, endpoint] of [
      ["SMS_PROVIDER_URL", value.SMS_PROVIDER_URL],
      ["WHATSAPP_PROVIDER_URL", value.WHATSAPP_PROVIDER_URL],
    ] as const) {
      if (endpoint && !endpoint.startsWith("https://"))
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} must use HTTPS in production`,
        });
    }
  });

export const environment = environmentSchema.parse(process.env);
