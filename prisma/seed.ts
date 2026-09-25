import { PrismaClient, RoleCode, RecordStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env", "apps/api/.env"] });

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL or DIRECT_URL is required to seed");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const developmentPassword = "AOnePhase2!2026";
const permissions = [
  "agency:read",
  "agency:create",
  "agency:update",
  "agency:delete",
  "branch:read",
  "branch:create",
  "branch:update",
  "branch:delete",
  "agent:read",
  "agent:create",
  "agent:update",
  "agent:delete",
  "bus:read",
  "bus:create",
  "bus:update",
  "bus:delete",
  "driver:read",
  "driver:create",
  "driver:update",
  "driver:delete",
  "route:read",
  "route:create",
  "route:update",
  "route:delete",
  "stop:read",
  "stop:create",
  "stop:update",
  "stop:delete",
  "boarding_point:read",
  "boarding_point:create",
  "boarding_point:update",
  "boarding_point:delete",
  "trip:read",
  "trip:create",
  "trip:update",
  "trip:delete",
  "trip:cancel",
  "booking:read",
  "booking:create",
  "finance:read",
  "finance:payment",
  "finance:refund",
  "finance:cancel",
  "finance:settlement",
  "finance:settings",
];

const roleDefinitions: Record<
  RoleCode,
  { name: string; permissions: string[] }
> = {
  SUPER_ADMIN: { name: "Super Admin", permissions },
  AGENCY_ADMIN: {
    name: "Agency Admin",
    permissions: permissions.filter(
      (code) =>
        code.startsWith("agency:") ||
        code.startsWith("branch:") ||
        code.startsWith("agent:") ||
        code.startsWith("bus:") ||
        code.startsWith("driver:") ||
        code.startsWith("route:") ||
        code.startsWith("stop:") ||
        code.startsWith("boarding_point:") ||
        code.startsWith("trip:") ||
        code.startsWith("booking:") ||
        code.startsWith("finance:"),
    ),
  },
  BRANCH_ADMIN: {
    name: "Branch Admin",
    permissions: permissions.filter(
      (code) =>
        code.endsWith(":read") ||
        code.startsWith("agent:") ||
        code.startsWith("booking:") ||
        ["finance:read", "finance:payment", "finance:refund", "finance:cancel"].includes(code),
    ),
  },
  AGENT: {
    name: "Agent",
    permissions: permissions.filter(
      (code) => code.endsWith(":read") || code.startsWith("booking:") || ["finance:read", "finance:payment", "finance:cancel"].includes(code),
    ),
  },
};

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("The development seed cannot run in production");
  const passwordHash = await Bun.password.hash(developmentPassword, {
    algorithm: "argon2id",
  });
  const permissionRecords = new Map<string, { id: string }>();
  for (const code of permissions)
    permissionRecords.set(
      code,
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          description: `Permission to ${code.replace(":", " ")}`,
        },
      }),
    );

  const roles = new Map<RoleCode, { id: string }>();
  for (const [code, definition] of Object.entries(roleDefinitions) as [
    RoleCode,
    (typeof roleDefinitions)[RoleCode],
  ][]) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: definition.name },
      create: { code, name: definition.name },
    });
    roles.set(code, role);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: definition.permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permissionRecords.get(permission)!.id,
      })),
    });
  }

  const agencyA = await prisma.agency.upsert({
    where: { slug: "agency-a" },
    update: {},
    create: { name: "Agency A", slug: "agency-a", status: RecordStatus.ACTIVE },
  });
  const agencyB = await prisma.agency.upsert({
    where: { slug: "agency-b" },
    update: {},
    create: { name: "Agency B", slug: "agency-b", status: RecordStatus.ACTIVE },
  });
  const branchA1 = await prisma.branch.upsert({
    where: { agencyId_code: { agencyId: agencyA.id, code: "A1" } },
    update: {},
    create: { agencyId: agencyA.id, name: "Branch A1", code: "A1" },
  });
  await prisma.branch.upsert({
    where: { agencyId_code: { agencyId: agencyA.id, code: "A2" } },
    update: {},
    create: { agencyId: agencyA.id, name: "Branch A2", code: "A2" },
  });
  await prisma.branch.upsert({
    where: { agencyId_code: { agencyId: agencyB.id, code: "B1" } },
    update: {},
    create: { agencyId: agencyB.id, name: "Branch B1", code: "B1" },
  });

  const users = [
    {
      email: "super.admin@aone.local",
      firstName: "Super",
      lastName: "Admin",
      roleCode: RoleCode.SUPER_ADMIN,
      agencyId: null,
      branchId: null,
    },
    {
      email: "agency.admin.a@aone.local",
      firstName: "Agency",
      lastName: "Admin A",
      roleCode: RoleCode.AGENCY_ADMIN,
      agencyId: agencyA.id,
      branchId: null,
    },
    {
      email: "branch.admin.a1@aone.local",
      firstName: "Branch",
      lastName: "Admin A1",
      roleCode: RoleCode.BRANCH_ADMIN,
      agencyId: agencyA.id,
      branchId: branchA1.id,
    },
    {
      email: "agent.a1@aone.local",
      firstName: "Agent",
      lastName: "A1",
      roleCode: RoleCode.AGENT,
      agencyId: agencyA.id,
      branchId: branchA1.id,
    },
  ];
  for (const user of users) {
    const { roleCode, ...userData } = user;
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        ...userData,
        passwordHash,
        status: RecordStatus.ACTIVE,
        onboardingCompleted: true,
        roleId: roles.get(roleCode)!.id,
      },
      create: {
        ...userData,
        passwordHash,
        status: RecordStatus.ACTIVE,
        roleId: roles.get(roleCode)!.id,
      },
    });
  }
  console.info(
    `Seeded ${users.length} development users. Password: ${developmentPassword}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
