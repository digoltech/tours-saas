import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import pg from "pg";
import { standardRoleNames, standardRolePermissions } from "../packages/shared/src/team-access.js";

config({ path: [".env", "apps/api/.env"], quiet: true });
const client = new pg.Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const sql = (await readFile(new URL("../prisma/migrations/20261009160000_simplify_team_roles/migration.sql", import.meta.url), "utf8"))
  .replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, "");
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const customSnapshot = `SELECT u.id, u."roleId", u."branchId" FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE NOT r."isSystem" ORDER BY u.id`;
const financialSnapshot = `SELECT 'bookings' AS kind, count(*)::text AS count, coalesce(sum("totalAmount"), 0)::text AS amount FROM "Booking"
UNION ALL SELECT 'commissions', count(*)::text, coalesce(sum(amount), 0)::text FROM "AgentCommission"
UNION ALL SELECT 'settlements', count(*)::text, coalesce(sum(amount), 0)::text FROM "Settlement"
UNION ALL SELECT 'ledger', count(*)::text, coalesce(sum(amount), 0)::text FROM "FinanceLedger" ORDER BY kind`;
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '5s'");
  const beforeCustom = JSON.stringify((await client.query(customSnapshot)).rows);
  const beforeFinance = JSON.stringify((await client.query(financialSnapshot)).rows);
  const beforeIds = JSON.stringify((await client.query(`SELECT id, code FROM "Role" ORDER BY id`)).rows);
  await client.query(sql);
  check(JSON.stringify((await client.query(customSnapshot)).rows) === beforeCustom, "Custom assignments changed");
  check(JSON.stringify((await client.query(financialSnapshot)).rows) === beforeFinance, "Financial history changed");
  check(JSON.stringify((await client.query(`SELECT id, code FROM "Role" ORDER BY id`)).rows) === beforeIds, "Existing role IDs changed");
  for (const [code, permissions] of Object.entries(standardRolePermissions)) {
    const result = await client.query(`SELECT r.name, r.scope, coalesce(array_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
      FROM "Role" r LEFT JOIN "RolePermission" rp ON rp."roleId" = r.id LEFT JOIN "Permission" p ON p.id = rp."permissionId"
      WHERE r.code = $1 GROUP BY r.id`, [code]);
    check(result.rows[0]?.name === standardRoleNames[code], `Wrong role name: ${code}`);
    check(JSON.stringify(result.rows[0].permissions) === JSON.stringify([...permissions].sort()), `Wrong permissions: ${code}`);
  }
  const invalid = await client.query(`SELECT u.id FROM "User" u JOIN "Role" r ON r.id = u."roleId"
    WHERE r.code IN ('AGENCY_ADMIN', 'BRANCH_ADMIN', 'AGENT') AND u."agencyId" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b.id = u."branchId" AND b."agencyId" = u."agencyId" AND b.status = 'ACTIVE')`);
  check(invalid.rowCount === 0, "Standard accounts still have invalid branches");
  const firstChanged = Number((await client.query("SELECT count(*)::int AS count FROM changed_users")).rows[0].count);
  await client.query("DROP TABLE desired_roles, desired_permissions, changed_users");
  await client.query(sql);
  check(Number((await client.query("SELECT count(*)::int AS count FROM changed_users")).rows[0].count) === 0, "Repeat migration changes access again");
  console.log(`Migration verified twice; ${firstChanged} accounts would receive refreshed access. Custom assignments and financial history preserved.`);
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
