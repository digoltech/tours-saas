import assert from "node:assert/strict";

const base = process.env.TEAM_TEST_API_URL ?? "http://localhost:4000";
const password = process.env.TEAM_TEST_PASSWORD ?? "AOnePhase2!2026";
const origin = "http://localhost:3000";
async function login(email: string) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, password }) });
  assert.equal(response.status, 200, `Login failed for ${email}`);
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const payload = await response.json();
  return { cookie, user: payload.data.user };
}
async function request(session: Awaited<ReturnType<typeof login>>, path: string, expected: number, body?: unknown, method = body ? "POST" : "GET") {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Cookie: session.cookie, Origin: origin, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
  return payload;
}
const owner = await login("agency.admin.a@aone.local");
const admin = await login("branch.admin.a1@aone.local");
const employee = await login("agent.a1@aone.local");
try {
  assert.equal(owner.user.roleName, "Agency owner");
  assert.equal(employee.user.roleName, "Employee");
  assert.equal(owner.user.roleScope, "AGENCY");
  assert.equal(employee.user.roleScope, "BRANCH");
  assert.ok(owner.user.branchId);
  const agencyId = owner.user.agencyId;
  const branches = (await request(owner, `/agencies/${agencyId}/branches`, 200)).data;
  const otherBranch = branches.find((branch: { id: string }) => branch.id !== admin.user.branchId);
  assert.ok(otherBranch, "The demo must contain two branches");
  const branchActivity = (await request(admin, "/audit-logs", 200)).data;
  assert.ok(branchActivity.every((row: {branchId:string}) => row.branchId === admin.user.branchId));
  await request(admin, `/audit-logs?branchId=${otherBranch.id}`, 403);
  await request(employee, "/audit-logs", 403);
  const ownerBranchActivity = (await request(owner, `/audit-logs?branchId=${otherBranch.id}`, 200)).data;
  assert.ok(ownerBranchActivity.every((row: {branchId:string}) => row.branchId === otherBranch.id));
  assert.ok(ownerBranchActivity.every((row: {agencyId:string}) => row.agencyId === agencyId));
  await request(admin, `/finance/ledger?branchId=${otherBranch.id}`, 403);
  const ownerLedger = (await request(owner, `/finance/ledger?branchId=${otherBranch.id}`, 200)).data;
  assert.ok(ownerLedger.every((row: {branchId:string}) => row.branchId === otherBranch.id));
  const futureReport = (await request(owner, "/finance/reports?from=2099-01-01&to=2099-01-02", 200)).data;
  assert.equal(futureReport.ledger.length, 0);
  const localReport = (await request(admin, "/finance/reports", 200)).data;
  assert.ok(localReport.ledger.every((row: {branchId:string}) => row.branchId === admin.user.branchId));
  const team = (await request(owner, `/agencies/${agencyId}/agents`, 200)).data;
  assert.ok(team.some((member: { roleCode: string }) => member.roleCode === "BRANCH_ADMIN"));
  const localTeam = (await request(admin, `/agencies/${agencyId}/agents`, 200)).data;
  assert.ok(localTeam.every((member: { branchId: string; roleCode: string }) => member.branchId === admin.user.branchId && member.roleCode === "AGENT"));
  await request(admin, `/agencies/${agencyId}/agents?branchId=${otherBranch.id}`, 403);
  await request(employee, `/agencies/${agencyId}/agents`, 403);
  await request(admin, `/agents/${owner.user.id}`, 403);
  await request(owner, `/agents/${owner.user.id}`, 400, { roleId: "invalid" }, "PATCH");
  const roles = (await request(owner, "/agency/roles", 200)).data.roles;
  const adminRole = roles.find((role: { code: string }) => role.code === "BRANCH_ADMIN");
  await request(admin, `/agencies/${agencyId}/agents`, 403, { firstName: "Test", lastName: "User", email: "blocked@example.invalid", branchId: admin.user.branchId, roleId: adminRole.id });
  await request(admin, `/agencies/${agencyId}/agents`, 403, { firstName: "Test", lastName: "User", email: "blocked@example.invalid", branchId: otherBranch.id });
  await request(admin, "/agency/roles", 403, { name: "Blocked", scope: "BRANCH", permissions: [] });
  const routes = (await request(employee, "/routes", 200)).data.data;
  assert.ok(routes.length);
  await request(employee, `/routes/${routes[0].id}`, 200);
  await request(employee, `/routes/${routes[0].id}/stops`, 200);
  await request(employee, `/routes/${routes[0].id}`, 403, { name: "Blocked" }, "PATCH");
  const buses = (await request(employee, "/buses", 200)).data.data;
  assert.ok(buses.every((bus: { branchId: string }) => bus.branchId === employee.user.branchId));
  const otherBuses = (await request(owner, `/buses?branchId=${otherBranch.id}`, 200)).data.data;
  if (otherBuses.length) await request(employee, `/buses/${otherBuses[0].id}`, 403);
  const bookings = (await request(employee, "/bookings", 200)).data.data;
  assert.ok(bookings.every((booking: { branchId: string }) => booking.branchId === employee.user.branchId));
  const ledger = (await request(employee, "/finance/ledger", 200)).data;
  assert.ok(ledger.every((entry: { branchId: string }) => entry.branchId === employee.user.branchId));
  await request(employee, `/finance/reports?branchId=${otherBranch.id}`, 403);
  await request(employee, `/finance/reports?agentId=${admin.user.id}`, 200);
  const people = (await request(employee, `/finance/people?agencyId=${agencyId}`, 200)).data;
  assert.ok(people.every((person: { branchId: string; email?: string }) => person.branchId === employee.user.branchId && person.email === undefined));
  await request(employee, "/auth/onboarding", 400, { agencyName: "Blocked", branchName: "Blocked" });
  await request(owner, `/branches/${owner.user.branchId}`, 400, { status: "INACTIVE" }, "PATCH");
  await request(employee, "/subscription", 403);
  await request(employee, "/subscription/invoices", 403);
  const bulk = await fetch(`${base}/api/bulk/buses/template`, { headers: { Cookie: employee.cookie } });
  assert.equal(bulk.status, 403);
  console.log("Owner, branch admin, and employee API checks passed: hierarchy, same-branch operations, shared routes, finance scope, and restricted billing/bulk access.");
} finally {
  await Promise.all([owner, admin, employee].map((session) => fetch(`${base}/api/auth/logout`, { method: "POST", headers: { Cookie: session.cookie, Origin: origin } })));
}
