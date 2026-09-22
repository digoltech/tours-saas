import type { Request, Response } from "express";

export function tenantAccess(request: Request, response: Response) {
  return response.json({
    success: true,
    data: {
      agencyId: request.params.agencyId,
      branchId: request.params.branchId ?? null,
      access: request.auth,
    },
  });
}
