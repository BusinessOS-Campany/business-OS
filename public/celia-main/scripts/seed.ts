import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { accounts, users } from "../drizzle/schema";

async function createUser(
  key: { username: string; password: string },
  profile: { name: string; email: string; role: string },
) {
  const existing = await db.query.users.findFirst({ where: eq(users.username, key.username) });
  if (existing) {
    console.log(`[seed] user ${key.username} already exists, skipping`);
    return;
  }

  const now = new Date();
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    name: profile.name,
    email: profile.email,
    emailVerified: true,
    role: profile.role,
    username: key.username,
    displayUsername: key.username,
    createdAt: now,
    updatedAt: now,
  });

  const passwordHash = await hashPassword(key.password);
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[seed] user created (username=${key.username}, password=${key.password})`);
}

async function main() {
  await createUser(
    { username: "admin", password: "admin" },
    { name: "المدير", email: "admin@celia.local", role: "admin" },
  );
  await createUser(
    { username: "demo", password: "demo123" },
    { name: "حساب تجريبي", email: "demo@celia.local", role: "admin" },
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exit(1);
  });
