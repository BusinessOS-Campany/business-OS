import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createUserSchema } from "@/lib/users/user";
import { getUsers } from "@/lib/users/queries";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "manage_roles");
  if (!guard.allowed) return guard.response;

  const summary = await getUsers();
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.usersManagement.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "manage_roles");
  if (!guard.allowed) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.usersManagement.invalidData },
      { status: 400 },
    );
  }

  const username = parsed.data.username;
  const email = `${username.toLowerCase()}@celia.local`;

  try {
    const existing = await db.query.users.findFirst({
      where: or(eq(schema.users.username, username), eq(schema.users.email, email)),
    });
    if (existing) {
      return NextResponse.json({ error: t.usersManagement.usernameExists }, { status: 409 });
    }

    const now = new Date();
    const userId = crypto.randomUUID();

    await db.insert(schema.users).values({
      id: userId,
      name: parsed.data.name,
      email,
      emailVerified: true,
      role: parsed.data.role,
      username,
      displayUsername: username,
      phone: parsed.data.phone,
      permissions: parsed.data.permissions,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const passwordHash = await hashPassword(parsed.data.password);
    await db.insert(schema.accounts).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    await createNotification({
      type: "user",
      action: "add",
      messageKey: "notifications.userAdded",
      messageParams: { name: parsed.data.name },
      entityId: userId,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.usersManagement.successMessage,
      id: userId,
    });
  } catch (error) {
    logger.error("user insert failed", { error });
    return NextResponse.json({ error: t.usersManagement.saveError }, { status: 500 });
  }
}
