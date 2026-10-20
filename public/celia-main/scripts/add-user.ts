import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { accounts, employees, users } from "../drizzle/schema";

async function main() {
  const username = "nasser";
  const password = "123";
  const now = new Date();

  let userId = (await db.query.users.findFirst({ where: eq(users.username, username) }))?.id ?? null;
  if (!userId) {
    userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      name: "ناصر",
      email: "nasser@celia.local",
      emailVerified: true,
      role: "employee",
      username,
      displayUsername: username,
      createdAt: now,
      updatedAt: now,
    });
    const passwordHash = await hashPassword(password);
    await db.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log("[add-user] nasser user created (username=nasser, password=123, role=employee)");
  } else {
    console.log("[add-user] nasser user already exists");
  }

  const existingEmployee = await db.query.employees.findFirst({
    where: eq(employees.createdBy, userId),
  });
  if (!existingEmployee) {
    await db.insert(employees).values({
      name: "ناصر",
      department: "employee",
      phone: null,
      salary: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });
    console.log("[add-user] nasser employee record created");
  } else {
    console.log("[add-user] nasser employee record already exists");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[add-user] failed:", error);
    process.exit(1);
  });
