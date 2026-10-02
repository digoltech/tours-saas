import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: "apps/api/.env", quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for a read-only audit");
const connection = new URL(url);
const tlsRequested = process.argv.includes("--tls");
if (tlsRequested) connection.searchParams.set("sslmode", "require");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection.toString() }) });
try {
  const tables = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean; anon_select: boolean; anon_write: boolean; authenticated_select: boolean; authenticated_write: boolean }>>`
    SELECT tablename, rowsecurity,
      has_table_privilege('anon', format('%I.%I', schemaname, tablename), 'SELECT') AS anon_select,
      has_table_privilege('anon', format('%I.%I', schemaname, tablename), 'INSERT,UPDATE,DELETE') AS anon_write,
      has_table_privilege('authenticated', format('%I.%I', schemaname, tablename), 'SELECT') AS authenticated_select,
      has_table_privilege('authenticated', format('%I.%I', schemaname, tablename), 'INSERT,UPDATE,DELETE') AS authenticated_write
    FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  const ssl = await prisma.$queryRaw<Array<{ ssl: boolean }>>`SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`;
  const exposed = tables.filter((table) => table.anon_select || table.anon_write || table.authenticated_select || table.authenticated_write);
  console.info(JSON.stringify({ supabaseHost: connection.hostname.endsWith(".supabase.co"), tlsRequested, publicTableCount: tables.length, tlsConnection: ssl[0]?.ssl ?? false, exposedTables: exposed }, null, 2));
  if (exposed.length || !ssl[0]?.ssl) process.exitCode = 1;
} catch (error) {
  const detail = String(error);
  console.error(JSON.stringify({ auditFailed: true, certificateError: /certificate|self.signed|CERT_/i.test(detail), connectionError: /connect|ECONN|timeout/i.test(detail) }));
  process.exitCode = 2;
} finally {
  await prisma.$disconnect();
}
