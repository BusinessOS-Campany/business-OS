import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { updateUserSchema } from "@/lib/users/user";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.usersManagement.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "manage_roles");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.usersManagement.invalidData },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.role !== undefined && parsed.data.role !== "admin") {
      const target = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
      if (target?.role === "admin") {
        const totalAdmins = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.users)
          .where(eq(schema.users.role, "admin"));
        if ((totalAdmins[0]?.count ?? 0) <= 1) {
          return NextResponse.json({ error: t.usersManagement.lastAdminError }, { status: 400 });
        }
      }
    }

    const values: Partial<typeof schema.users.$inferInsert> = {};
    if (parsed.data.name !== undefined) values.name = parsed.data.name;
    if (parsed.data.phone !== undefined) values.phone = parsed.data.phone;
    if (parsed.data.role !== undefined) values.role = parsed.data.role;
    if (parsed.data.permissions !== undefined) values.permissions = parsed.data.permissions;
    if (parsed.data.isActive !== undefined) values.isActive = parsed.data.isActive;
    values.updatedAt = new Date();

    const [row] = await db
      .update(schema.users)
      .set(values)
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });

    if (!row) {
      return NextResponse.json({ error: t.usersManagement.notFound }, { status: 404 });
    }

    if (parsed.data.password && parsed.data.password.length >= 3) {
      const passwordHash = await hashPassword(parsed.data.password);
      await db
        .update(schema.accounts)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(
          and(eq(schema.accounts.userId, id), eq(schema.accounts.providerId, "credential")),
        );
    }

    await createNotification({
      type: "user",
      action: "update",
      messageKey: "notifications.userUpdated",
      messageParams: { name: parsed.data.name ?? "" },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.usersManagement.savedMessage,
      id: row.id,
    });
  } catch (error) {
    logger.error("user update failed", { error });
    return NextResponse.json({ error: t.usersManagement.saveError }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.usersManagement.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "manage_roles");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  if (session.user.id === id) {
    return NextResponse.json({ error: t.usersManagement.cannotDeleteSelf }, { status: 400 });
  }

  try {
    const target = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (target?.role === "admin") {
      const totalAdmins = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.role, "admin"));
      if ((totalAdmins[0]?.count ?? 0) <= 1) {
        return NextResponse.json({ error: t.usersManagement.lastAdminError }, { status: 400 });
      }
    }

    const [row] = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });

    if (!row) {
      return NextResponse.json({ error: t.usersManagement.notFound }, { status: 404 });
    }

    await createNotification({
      type: "user",
      action: "delete",
      messageKey: "notifications.userDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.usersManagement.deletedMessage });
  } catch (error) {
    logger.error("user delete failed", { error });
    return NextResponse.json({ error: t.usersManagement.deleteError }, { status: 500 });
  }
}
