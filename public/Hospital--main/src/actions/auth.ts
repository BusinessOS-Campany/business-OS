"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notifications";
import type { ActionResult } from "@/lib/result";

const loginSchema = z.object({
  email: z.string().min(1, { message: "invalid-email" }),
  password: z.string().min(1, { message: "required" }),
});

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "auth.invalidCredentials" };
  }

  const { email, password } = parsed.data;

  const identifier = email.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    include: { role: true, employee: true },
  });

  if (!user || !user.passwordHash) {
    return { ok: false, error: "auth.invalidCredentials" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await audit({
      userId: user.id,
      action: "failed_login",
      module: "auth",
      description: "Failed login attempt",
    });
    return { ok: false, error: "auth.invalidCredentials" };
  }

  if (!user.isActive || user.userStatus === "LOCKED") {
    return { ok: false, error: "auth.accountDisabled" };
  }

  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    userId: user.id,
    action: "login",
    module: "auth",
    description: `User login (${user.role?.nameEn ?? user.email})`,
  });
  await notifyUser({
    userId: user.id,
    title: "Welcome",
    body: `Signed in to ${user.role?.nameEn ?? "the system"}`,
    type: "SUCCESS",
    link: "/dashboard",
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  await audit({
    action: "logout",
    module: "auth",
    description: "User logout",
  });
  redirect("/login");
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const schema = z.object({
    current: z.string().min(1),
    next: z.string().min(8),
  });
  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { current, next } = parsed.data;
  const sessionUser = await getSessionUserPlain();
  if (!sessionUser) return { ok: false, error: "common.notSignedIn" };

  const user = await prisma.user.findUnique({ where: { id: sessionUser } });
  if (!user) return { ok: false, error: "common.notFound" };

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect" };

  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash, mustChangePassword: false },
  });
  await audit({ userId: user.id, action: "change_password", module: "auth" });
  return { ok: true };
}

async function getSessionUserPlain(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const { jwtVerify } = await import("jose");
  const store = await cookies();
  const token = store.get("ycm_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me-in-production-9f8e7d6c5b4a")
    );
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}