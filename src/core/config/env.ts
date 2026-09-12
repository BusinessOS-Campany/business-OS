import { z } from "zod";

/**
 * Runtime environment contract. Parsed lazily on first access so that
 * `next build` never fails on missing runtime-only secrets.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SEED_PLATFORM_ADMIN_EMAIL: z.string().email(),
  SEED_PLATFORM_ADMIN_PASSWORD: z.string().min(8),
  STORAGE_PATH: z.string().default("./.data/storage"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

declare global {
  var __bosEnv: AppEnv | undefined;
}

export function getEnv(): AppEnv {
  if (globalThis.__bosEnv) return globalThis.__bosEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`[config] Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join(".")}`).join(", ")}`);
  }
  globalThis.__bosEnv = parsed.data;
  return parsed.data;
}
