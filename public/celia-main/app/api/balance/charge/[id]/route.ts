import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createBalanceChargeSchema } from "@/lib/balance/charge";
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
    return NextResponse.json({ error: t.balance.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_balance");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createBalanceChargeSchema(t).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? t.balance.invalidData },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .update(schema.balanceCharge)
      .set({
        provider: parsed.data.provider,
        amount: parsed.data.amount.toString(),
        notes: parsed.data.notes,
      })
      .where(eq(schema.balanceCharge.id, id))
      .returning({ id: schema.balanceCharge.id });

    if (!row) {
      return NextResponse.json({ error: t.balanceTotals.notFound }, { status: 404 });
    }

    await createNotification({
      type: "balance",
      action: "update",
      messageKey: "notifications.balanceUpdated",
      messageParams: { amount: parsed.data.amount.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.balanceTotals.updatedMessage, id: row.id });
  } catch (error) {
    logger.error("balance charge update failed", { error });
    return NextResponse.json({ error: t.balance.saveError }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.balance.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_balance");
  if (!guard.allowed) return guard.response;

  const { id } = await context.params;

  try {
    const [row] = await db
      .delete(schema.balanceCharge)
      .where(eq(schema.balanceCharge.id, id))
      .returning({ id: schema.balanceCharge.id });

    if (!row) {
      return NextResponse.json({ error: t.balanceTotals.notFound }, { status: 404 });
    }

    await createNotification({
      type: "balance",
      action: "delete",
      messageKey: "notifications.balanceDeleted",
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.balanceTotals.deletedMessage });
  } catch (error) {
    logger.error("balance charge delete failed", { error });
    return NextResponse.json({ error: t.balanceTotals.deleteError }, { status: 500 });
  }
}
