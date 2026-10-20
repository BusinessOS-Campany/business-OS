import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createBalanceChargeSchema } from "@/lib/balance/charge";
import { getBalanceCharges } from "@/lib/balance/queries";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "total_recharge");
  if (!guard.allowed) return guard.response;

  const summary = await getBalanceCharges();
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.balance.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_balance");
  if (!guard.allowed) return guard.response;

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
      .insert(schema.balanceCharge)
      .values({
        provider: parsed.data.provider,
        amount: parsed.data.amount.toString(),
        notes: parsed.data.notes,
        createdBy: session.user.id,
      })
      .returning({ id: schema.balanceCharge.id });

    await createNotification({
      type: "balance",
      action: "add",
      messageKey: "notifications.balanceAdded",
      messageParams: { amount: parsed.data.amount.toString(), provider: parsed.data.provider },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.balance.successMessage, id: row.id });
  } catch (error) {
    logger.error("balance charge insert failed", { error });
    return NextResponse.json({ error: t.balance.saveError }, { status: 500 });
  }
}
