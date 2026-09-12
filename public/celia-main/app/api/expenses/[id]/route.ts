import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createExpenseSchema } from "@/lib/expenses/expense";
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
    return NextResponse.json({ error: t.addExpense.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_expenses");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createExpenseSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.addExpense.invalidData },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .update(schema.expenses)
      .set({
        type: parsed.data.type,
        amount: parsed.data.amount.toString(),
        paymentMethod: parsed.data.paymentMethod,
        expenseDate: new Date(parsed.data.expenseDate),
        notes: parsed.data.notes,
      })
      .where(eq(schema.expenses.id, id))
      .returning({ id: schema.expenses.id });

    if (!row) {
      return NextResponse.json({ error: t.addExpense.notFound }, { status: 404 });
    }

    await createNotification({
      type: "expense",
      action: "update",
      messageKey: "notifications.expenseUpdated",
      messageParams: { amount: parsed.data.amount.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.addExpense.updatedMessage,
      id: row.id,
    });
  } catch (error) {
    logger.error("expense update failed", { error });
    return NextResponse.json({ error: t.addExpense.saveError }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = _request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.addExpense.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_expenses");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  try {
    const [row] = await db
      .delete(schema.expenses)
      .where(eq(schema.expenses.id, id))
      .returning({ id: schema.expenses.id });

    if (!row) {
      return NextResponse.json({ error: t.addExpense.notFound }, { status: 404 });
    }

    await createNotification({
      type: "expense",
      action: "delete",
      messageKey: "notifications.expenseDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.addExpense.deletedMessage });
  } catch (error) {
    logger.error("expense delete failed", { error });
    return NextResponse.json({ error: t.addExpense.deleteError }, { status: 500 });
  }
}
