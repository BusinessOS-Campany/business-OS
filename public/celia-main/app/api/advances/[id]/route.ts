import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createAdvanceSchema } from "@/lib/advances/advance";
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
    return NextResponse.json({ error: t.addAdvance.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_loan");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createAdvanceSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.addAdvance.invalidData },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .update(schema.advances)
      .set({
        employeeId: parsed.data.employeeId,
        employeeName: parsed.data.employeeName,
        amount: parsed.data.amount.toString(),
        advanceDate: new Date(parsed.data.advanceDate),
        notes: parsed.data.notes,
      })
      .where(eq(schema.advances.id, id))
      .returning({ id: schema.advances.id });

    if (!row) {
      return NextResponse.json({ error: t.addAdvance.notFound }, { status: 404 });
    }

    await createNotification({
      type: "advance",
      action: "update",
      messageKey: "notifications.advanceUpdated",
      messageParams: { amount: parsed.data.amount.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.addAdvance.updatedMessage,
      id: row.id,
    });
  } catch (error) {
    logger.error("advance update failed", { error });
    return NextResponse.json({ error: t.addAdvance.saveError }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = _request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addAdvance.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_loan");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  try {
    const [row] = await db
      .delete(schema.advances)
      .where(eq(schema.advances.id, id))
      .returning({ id: schema.advances.id });

    if (!row) {
      return NextResponse.json({ error: t.addAdvance.notFound }, { status: 404 });
    }

    await createNotification({
      type: "advance",
      action: "delete",
      messageKey: "notifications.advanceDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addAdvance.deletedMessage });
  } catch (error) {
    logger.error("advance delete failed", { error });
    return NextResponse.json({ error: t.addAdvance.deleteError }, { status: 500 });
  }
}
