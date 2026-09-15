const fallbacks: Record<string, string> = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/yemen_care_hms",
  AUTH_SECRET: "dev-secret-change-me-in-production-9f8e7d6c5b4a",
  NEXT_PUBLIC_APP_NAME: "YemenCare HMS",
  SEED_ADMIN_EMAIL: "admin@yemencare.local",
  SEED_ADMIN_PASSWORD: "Admin@123",
};

/** Resolve an env var, falling back to safe dev-only defaults. */
export function env(key: string): string {
  return process.env[key] ?? fallbacks[key] ?? "";
}

export function requireEnv(key: string): string {
  const value = env(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}