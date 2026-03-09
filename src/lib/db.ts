import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString() {
  let url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production") {
    // Strip sslmode from URL — SSL is configured directly on the Pool
    url = url.replace(/[?&]sslmode=[^&]*/, "");
  }
  return url;
}

function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === "production";
  const pool = new Pool({
    connectionString: getConnectionString(),
    ...(isProduction && { ssl: { rejectUnauthorized: false } }),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
