import type { RequestHandler } from "express";
import { prisma } from "../config/prisma.js";

export const auditPlatformMutation: RequestHandler = (request, response, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
  response.on("finish", () => {
    if (request.auth?.role !== "SUPER_ADMIN" || response.statusCode >= 400) return;
    void prisma.securityEvent.create({ data: {
      userId: request.auth.userId,
      action: request.method,
      route: `${request.baseUrl}${request.route?.path ?? request.path}`,
    } }).catch((error) => console.error("Security audit failed", error));
  });
  next();
};
