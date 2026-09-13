import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

declare global {
  var __bosPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("[db] DATABASE_URL is not set");
  }
  // pg does not understand Prisma's ?schema= convention — strip it and pass explicitly.
  const pgUrl = connectionString.replace(/\?schema=[^&]*$/, "");
  const schema = /\bschema=([^&]+)/.exec(connectionString)?.[1] ?? "public";
  const pool = new Pool({ connectionString: pgUrl, max: 10 });
  const adapter = new PrismaPg(pool, { schema: process.env.DATABASE_SCHEMA ?? schema });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalThis.__bosPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__bosPrisma = prisma;
}
