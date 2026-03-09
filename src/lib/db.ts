import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString() {
  let url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production") {
    // Replace deprecated sslmode values with verify-full to suppress pg warning
    url = url.replace(/sslmode=(prefer|require|verify-ca)/, "sslmode=verify-full");
  }
  return url;
}

function createPrismaClient() {
  const pool = new Pool({ connectionString: getConnectionString() });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
