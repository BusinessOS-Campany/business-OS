import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createHobaniIncomeSchema } from "@/lib/hobani/income";
import { HOBANI_TOTALS_CACHE_KEY } from "@/lib/hobani/totals";
import { invalidateCached } from "@/lib/cache";
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
    return NextResponse.json({ error: t.hobani.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_hobani_income");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createHobaniIncomeSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.hobani.invalidData },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .update(schema.hobaniIncome)
      .set({
        income: parsed.data.income.toString(),
        period: parsed.data.period,
        cardType: parsed.data.cardType ?? null,
        quantity: parsed.data.quantity,
      })
      .where(eq(schema.hobaniIncome.id, id))
      .returning({ id: schema.hobaniIncome.id });

    if (!row) {
      return NextResponse.json({ error: t.hobani.notFound }, { status: 404 });
    }

    invalidateCached(HOBANI_TOTALS_CACHE_KEY);

    await createNotification({
      type: "hobani",
      action: "update",
      messageKey: "notifications.hobaniUpdated",
      messageParams: { amount: parsed.data.income.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.hobani.updatedMessage,
      id: row.id,
    });
  } catch (error) {
    logger.error("hobani income update failed", { error });
    return NextResponse.json({ error: t.hobani.updateError }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.hobani.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_hobani_income");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  try {
    const [row] = await db
      .delete(schema.hobaniIncome)
      .where(eq(schema.hobaniIncome.id, id))
      .returning({ id: schema.hobaniIncome.id });

    if (!row) {
      return NextResponse.json({ error: t.hobani.notFound }, { status: 404 });
    }

    invalidateCached(HOBANI_TOTALS_CACHE_KEY);

    await createNotification({
      type: "hobani",
      action: "delete",
      messageKey: "notifications.hobaniDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.hobani.deletedMessage });
  } catch (error) {
    logger.error("hobani income delete failed", { error });
    return NextResponse.json({ error: t.hobani.deleteError }, { status: 500 });
  }
}
