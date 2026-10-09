import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

function positiveSetting(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`${name} must be a positive integer`);
  return value;
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    max: positiveSetting("DB_POOL_MAX", 10),
    connectionTimeoutMillis: positiveSetting("DB_CONNECTION_TIMEOUT_MS", 10000),
    idleTimeoutMillis: 30000,
  }),
  log: [{ emit: "event", level: "query" }],
});
const slowQueryMs = positiveSetting("DB_SLOW_QUERY_MS", 500);
prisma.$on("query", (event) => {
  // Never log SQL or parameters: queries may contain passenger/session information.
  if (event.duration >= slowQueryMs)
    console.warn(`[slow db] ${event.duration}ms`);
});
