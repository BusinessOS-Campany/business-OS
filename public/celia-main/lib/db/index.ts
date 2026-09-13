import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/drizzle/schema";

const connectionString = process.env.DATABASE_URL;
const requiresTls =
  /supabase\.(co|com)/i.test(connectionString ?? "") || process.env.DB_SSL === "true";

const SCHEMA = process.env.DB_SCHEMA ?? "celia";

const globalForPool = globalThis as unknown as { celiaPool?: Pool };

function createPool() {
  const pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: requiresTls ? { rejectUnauthorized: false } : undefined,
  });

  pool.on("connect", (client) => {
    client.query(`SET search_path TO ${SCHEMA}, public`).catch(() => {});
  });

  return pool;
}

const pool = globalForPool.celiaPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPool.celiaPool = pool;

export const db = drizzle(pool, { schema });

export type DB = typeof db;

export { schema };