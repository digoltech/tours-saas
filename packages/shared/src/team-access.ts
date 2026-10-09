export const standardRoleNames: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  AGENCY_ADMIN: "Agency owner",
  BRANCH_ADMIN: "Branch admin",
  AGENT: "Employee",
};

export const standardRoleDescriptions: Record<string, string> = {
  AGENCY_ADMIN: "Manages the agency, all branches, and team access. Operates the main branch by default.",
  BRANCH_ADMIN: "Runs this branch and manages its employees. Appointed by the agency owner.",
  AGENT: "Works with bookings, customers, finance, trips, and fleet in this branch. Cannot manage staff or agency settings.",
};

const operations = [
  "agency:read", "branch:read", "bus:read", "bus:create", "bus:update", "bus:delete",
  "driver:read", "driver:create", "driver:update", "driver:delete", "route:read",
  "stop:read", "boarding_point:read", "trip:read", "trip:create", "trip:update",
  "trip:delete", "trip:cancel", "booking:read", "booking:create", "finance:read",
  "finance:payment", "finance:refund", "finance:cancel", "finance:settlement",
];

export const standardRolePermissions: Record<string, readonly string[]> = {
  AGENT: operations,
  BRANCH_ADMIN: [...operations, "agent:read", "agent:create", "agent:update", "agent:delete"],
  AGENCY_ADMIN: [...operations, "agency:update", "branch:create", "branch:update", "branch:delete",
    "agent:read", "agent:create", "agent:update", "agent:delete", "route:create", "route:update",
    "route:delete", "stop:create", "stop:update", "stop:delete", "boarding_point:create",
    "boarding_point:update", "boarding_point:delete", "finance:settings"],
};

export function isAgencyOwner(role: string | undefined) {
  return role === "AGENCY_ADMIN" || role === "SUPER_ADMIN";
}

export function canManageTeam(role: string | undefined) {
  return isAgencyOwner(role) || role === "BRANCH_ADMIN";
}
