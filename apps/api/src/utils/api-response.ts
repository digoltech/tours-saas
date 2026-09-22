import type { Response } from "express";

export function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
  return response.status(status).json({
    success: false,
    error: { code, message },
  });
}
