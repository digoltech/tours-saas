import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required to initialize Prisma");
}

export const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: databaseUrl }),
});
