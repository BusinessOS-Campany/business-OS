import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  // The pg driver adapter always defaults to `public`, ignoring Prisma's
  // ?schema= URL convention (only the migrate CLI reads that). Pass the schema
  // explicitly so an org's own database and the platform's demo schemas both
  // resolve their tables the same way the Prisma models do.
  //
  // Read defensively: `new URL("")` throws ERR_INVALID_URL, and this module runs
  // at import time. During `next build` it is evaluated while collecting page
  // data, so an unset DATABASE_URL used to fail the entire build with "Failed to
  // collect configuration for /api/notifications/process" rather than with
  // anything naming the missing variable. An absent schema is a build-time
  // question only; at runtime the platform always passes DATABASE_SCHEMA.
  let schemaFromUrl: string | null = null;
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      schemaFromUrl = new URL(url).searchParams.get("schema");
    } catch {
      schemaFromUrl = null;
    }
  }

  const adapter = new PrismaPg(
    { connectionString: process.env.DATABASE_URL },
    {
      schema: process.env.DATABASE_SCHEMA ?? schemaFromUrl ?? undefined,
    },
  );
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
