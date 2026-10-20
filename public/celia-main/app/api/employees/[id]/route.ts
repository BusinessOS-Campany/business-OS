import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { updateEmployeeSchema } from "@/lib/employees/employee";
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
    return NextResponse.json({ error: t.employeesManagement.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "manage_roles");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateEmployeeSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.employeesManagement.invalidData },
      { status: 400 },
    );
  }

  try {
    const values: Partial<typeof schema.employees.$inferInsert> = {};
    if (parsed.data.name !== undefined) values.name = parsed.data.name;
    if (parsed.data.department !== undefined) values.department = parsed.data.department || null;
    if (parsed.data.phone !== undefined) values.phone = parsed.data.phone || null;
    if (parsed.data.salary !== undefined) values.salary = String(parsed.data.salary);
    if (parsed.data.isActive !== undefined) values.isActive = parsed.data.isActive;
    values.updatedAt = new Date();

    const [row] = await db
      .update(schema.employees)
      .set(values)
      .where(eq(schema.employees.id, id))
      .returning({ id: schema.employees.id });

    if (!row) {
      return NextResponse.json({ error: t.employeesManagement.notFound }, { status: 404 });
    }

    await createNotification({
      type: "employee",
      action: "update",
      messageKey: "notifications.employeeUpdated",
      messageParams: { name: parsed.data.name ?? "" },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.employeesManagement.savedMessage,
      id: row.id,
    });
  } catch (error) {
    logger.error("employee update failed", { error });
    return NextResponse.json({ error: t.employeesManagement.saveError }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = _request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.employeesManagement.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "manage_roles");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  try {
    const [row] = await db
      .delete(schema.employees)
      .where(eq(schema.employees.id, id))
      .returning({ id: schema.employees.id });

    if (!row) {
      return NextResponse.json({ error: t.employeesManagement.notFound }, { status: 404 });
    }

    await createNotification({
      type: "employee",
      action: "delete",
      messageKey: "notifications.employeeDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.employeesManagement.deletedMessage });
  } catch (error) {
    logger.error("employee delete failed", { error });
    return NextResponse.json({ error: t.employeesManagement.deleteError }, { status: 500 });
  }
}
