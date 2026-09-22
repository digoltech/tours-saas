import type { Request, Response } from "express";
import type { ApiHealthResponse } from "@a-one-tours/shared";

export function getHealth(
  _request: Request,
  response: Response<ApiHealthResponse>,
) {
  response.json({ success: true, message: "API is running" });
}
