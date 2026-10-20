import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createAdvanceSchema } from "@/lib/advances/advance";
import { getAdvances } from "@/lib/advances/queries";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "view_loans");
  if (!guard.allowed) return guard.response;

  const summary = await getAdvances();
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addAdvance.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_loan");
  if (!guard.allowed) return guard.response;

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
      .insert(schema.advances)
      .values({
        employeeId: parsed.data.employeeId,
        employeeName: parsed.data.employeeName,
        amount: parsed.data.amount.toString(),
        advanceDate: new Date(parsed.data.advanceDate),
        notes: parsed.data.notes,
        createdBy: session.user.id,
      })
      .returning({ id: schema.advances.id });

    await createNotification({
      type: "advance",
      action: "add",
      messageKey: "notifications.advanceAdded",
      messageParams: { amount: parsed.data.amount.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addAdvance.successMessage, id: row.id });
  } catch (error) {
    logger.error("advance insert failed", { error });
    return NextResponse.json({ error: t.addAdvance.saveError }, { status: 500 });
  }
}
