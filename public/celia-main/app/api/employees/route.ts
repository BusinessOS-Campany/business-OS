import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createEmployeeSchema } from "@/lib/employees/employee";
import { getEmployees } from "@/lib/employees/queries";
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

  const summary = await getEmployees();
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.employeesManagement.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "manage_roles");
  if (!guard.allowed) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = createEmployeeSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.employeesManagement.invalidData },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(schema.employees)
      .values({
        name: parsed.data.name,
        department: parsed.data.department || null,
        phone: parsed.data.phone || null,
        salary: parsed.data.salary === undefined ? null : String(parsed.data.salary),
        isActive: parsed.data.isActive,
        createdBy: session.user.id,
      })
      .returning({ id: schema.employees.id });

    await createNotification({
      type: "employee",
      action: "add",
      messageKey: "notifications.employeeAdded",
      messageParams: { name: parsed.data.name },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.employeesManagement.successMessage,
      id: row.id,
    });
  } catch (error) {
    logger.error("employee insert failed", { error });
    return NextResponse.json({ error: t.employeesManagement.saveError }, { status: 500 });
  }
}
