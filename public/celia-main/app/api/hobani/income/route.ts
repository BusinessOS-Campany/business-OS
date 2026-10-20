import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { createHobaniIncomeSchema } from "@/lib/hobani/income";
import {
  deleteHobaniIncomeByDayPeriod,
  getHobaniIncomeRecords,
  HOBANI_TOTALS_CACHE_KEY,
} from "@/lib/hobani/totals";
import { invalidateCached } from "@/lib/cache";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.hobani.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "total_hobani_income");
  if (!guard.allowed) return guard.response;

  const url = new URL(request.url);
  const day = url.searchParams.get("day");
  const period = url.searchParams.get("period");

  if (!day || !period) {
    return NextResponse.json({ error: t.hobani.invalidData }, { status: 400 });
  }

  try {
    const records = await getHobaniIncomeRecords(day, period);
    return NextResponse.json({ records });
  } catch (error) {
    logger.error("hobani records fetch failed", { error });
    return NextResponse.json({ error: t.hobani.serverError }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.hobani.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_hobani_income");
  if (!guard.allowed) return guard.response;

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
      .insert(schema.hobaniIncome)
      .values({
        income: parsed.data.income.toString(),
        period: parsed.data.period,
        cardType: parsed.data.cardType ?? null,
        quantity: parsed.data.quantity,
        createdBy: session.user.id,
      })
      .returning({ id: schema.hobaniIncome.id });

    invalidateCached(HOBANI_TOTALS_CACHE_KEY);

    await createNotification({
      type: "hobani",
      action: "add",
      messageKey: "notifications.hobaniAdded",
      messageParams: { amount: parsed.data.income.toString() },
      entityId: row.id,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.hobani.successMessage, id: row.id });
  } catch (error) {
    logger.error("hobani income insert failed", { error });
    return NextResponse.json({ error: t.hobani.saveError }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.hobani.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "add_hobani_income");
  if (!guard.allowed) return guard.response;

  const body = await request.json().catch(() => null);
  const day = (body?.day as string | undefined)?.trim();
  const period = (body?.period as string | undefined)?.trim();

  if (!day || !period) {
    return NextResponse.json({ error: t.hobani.invalidData }, { status: 400 });
  }

  try {
    const deleted = await deleteHobaniIncomeByDayPeriod(day, period);
    invalidateCached(HOBANI_TOTALS_CACHE_KEY);

    await createNotification({
      type: "hobani",
      action: "delete",
      messageKey: "notifications.hobaniDeleted",
      messageParams: { day },
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({
      success: true,
      message: t.hobani.deletedMessage,
      deleted,
    });
  } catch (error) {
    logger.error("hobani income group delete failed", { error });
    return NextResponse.json({ error: t.hobani.deleteError }, { status: 500 });
  }
}
