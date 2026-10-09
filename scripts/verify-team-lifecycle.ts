import { config } from "dotenv";
import assert from "node:assert/strict";
import { mock } from "bun:test";

config({ path: "apps/api/.env", quiet: true });

// Capture invitation links locally: validation must never deliver test emails.
const invitations: string[] = [];
mock.module("../apps/api/src/services/email.service.js", () => ({
  sendTeamInvitation: async ({ invitationUrl }: { invitationUrl: string }) => { invitations.push(invitationUrl); },
  sendTeamWelcome: async () => {},
  sendPasswordResetOtp: async () => {},
}));
const auth = await import("../apps/api/src/services/auth.service.js");
const management = await import("../apps/api/src/services/management.service.js");
const { prisma } = await import("../apps/api/src/config/prisma.js");
let agencyId: string | null = null;
try {
  const suffix = crypto.randomUUID();
  const owner = await auth.registerUser({ firstName: "Validation", lastName: "Owner", email: `owner-${suffix}@example.invalid`, password: "TeamValidation!2026" });
  agencyId = owner.agencyId!;
  const ownerContext = auth.toAuthContext(owner);
  assert.equal(ownerContext.roleName, "Agency owner");
  assert.equal(ownerContext.roleScope, "AGENCY");
  assert.ok(owner.branchId);
  assert.equal((await prisma.branch.findUniqueOrThrow({ where: { id: owner.branchId! } })).code, "MAIN");
  const branch = await management.createBranch(ownerContext, agencyId, { name: "Second branch", code: "SECOND" });
  assert.equal(await prisma.user.count({ where: { branchId: branch.id } }), 0);
  const role = await prisma.role.findUniqueOrThrow({ where: { code: "BRANCH_ADMIN" } });
  const admin = await management.createAgent(ownerContext, agencyId, { firstName: "Validation", lastName: "Admin", email: `admin-${suffix}@example.invalid`, branchId: branch.id, roleId: role.id });
  assert.equal(admin.role.code, "BRANCH_ADMIN");
  const adminContext = await auth.acceptInvitation(new URL(invitations.pop()!).pathname.split("/").pop()!, "TeamValidation!2026");
  assert.equal(adminContext.branchId, branch.id);
  const employee = await management.createAgent(adminContext, agencyId, { firstName: "Validation", lastName: "Employee", email: `employee-${suffix}@example.invalid` });
  assert.equal(employee.branchId, branch.id);
  const employeeContext = await auth.acceptInvitation(new URL(invitations.pop()!).pathname.split("/").pop()!, "TeamValidation!2026");
  assert.equal(employeeContext.roleName, "Employee");
  const session = await auth.createSession(employeeContext);
  assert.ok(await auth.verifySession(session));
  await assert.rejects(management.updateAgent(adminContext, employee.id, { branchId: owner.branchId }), /your branch/);
  await management.updateAgent(ownerContext, employee.id, { branchId: owner.branchId });
  assert.equal(await auth.verifySession(session), null);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })).branchId, owner.branchId);
  await assert.rejects(management.createAgent(adminContext, agencyId, { firstName: "Blocked", lastName: "Admin", email: `blocked-${suffix}@example.invalid`, roleId: role.id }), /Only agency owners/);
  console.log("Lifecycle verified: registration/main branch, branch without admin, owner appointment, branch-admin employee invitation, transfer boundaries, and session revocation.");
} finally {
  if (agencyId) {
    await prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { agencyId } });
      await tx.auditLog.deleteMany({ where: { agencyId } });
      await tx.user.deleteMany({ where: { agencyId } });
      await tx.agency.delete({ where: { id: agencyId } });
    });
  }
  await prisma.$disconnect();
}
