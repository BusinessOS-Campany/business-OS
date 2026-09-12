import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/drizzle/schema";

const connectionString = process.env.DATABASE_URL;
const requiresTls =
  /supabase\.(co|com)/i.test(connectionString ?? "") || process.env.DB_SSL === "true";

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: requiresTls ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;

export { schema };
