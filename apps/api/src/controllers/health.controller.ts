import type { Request, Response } from "express";
import type { ApiHealthResponse } from "@a-one-tours/shared";
import { prisma } from "../config/prisma.js";

export async function getHealth(
  _request: Request,
  response: Response<ApiHealthResponse>,
) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ success: true, message: "API and database are healthy" });
  } catch {
    response
      .status(503)
      .json({ success: false, message: "Database health check failed" });
  }
}
