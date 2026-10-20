import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrisma>;
};

function createPrisma() {
  const isSupabase = (process.env.DATABASE_URL || "").includes("supabase");
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(isSupabase
      ? { datasources: { db: { url: `${process.env.DATABASE_URL}&connection_limit=1&pool_timeout=0` } } }
      : {}),
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
