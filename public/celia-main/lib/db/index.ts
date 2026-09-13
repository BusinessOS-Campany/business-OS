import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/drizzle/schema";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL is not set");

// Supabase's session pooler (port 5432) caps concurrent sessions (~15,
// EMAXCONNSESSION) and is shared across apps/instances on serverless.
// The transaction pooler (port 6543) multiplexes many clients over a small
// backend pool, so use it whenever the URL points at the pooler host.
const connectionString = rawUrl
  .replace(/(pooler\.supabase\.(?:co|com)):5432\//, "$1:6543/")
  .replace(/\?schema=[^&]*$/, "");

const requiresTls =
  /supabase\.(co|com)/i.test(connectionString) || process.env.DB_SSL === "true";

const SCHEMA = process.env.DB_SCHEMA ?? "celia";

const globalForPool = globalThis as unknown as { celiaPool?: Pool };

function createPool() {
  const pool = new Pool({
    connectionString,
    // Startup option, not a connect-time SET: survives transaction pooling and
    // avoids racing queries on a freshly connected client.
    options: `-c search_path=${SCHEMA},public`,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: requiresTls ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
}

const pool = globalForPool.celiaPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPool.celiaPool = pool;

export const db = drizzle(pool, { schema });

export type DB = typeof db;

export { schema };