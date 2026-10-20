import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { getCopyPricePerGB, setCopyPricePerGB } from "@/lib/pricing/copy-price-store";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "set_copy_price");
  if (!guard.allowed) return guard.response;

  const pricePerGB = await getCopyPricePerGB();
  return NextResponse.json({ pricePerGB });
}

export async function PUT(request: Request) {
  const session = await getSession();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);

  if (!session?.user) {
    return NextResponse.json({ error: t.copyPriceSettings.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "set_copy_price");
  if (!guard.allowed) return guard.response;

  const body = (await request.json().catch(() => null)) as { pricePerGB?: unknown } | null;
  const pricePerGB = Number(body?.pricePerGB);
  if (!body || !Number.isFinite(pricePerGB) || pricePerGB <= 0) {
    return NextResponse.json({ error: t.copyPriceSettings.priceError }, { status: 400 });
  }

  try {
    await setCopyPricePerGB(pricePerGB);

    await createNotification({
      type: "copyPrice",
      action: "update",
      messageKey: "notifications.copyPriceUpdated",
      messageParams: { price: String(pricePerGB) },
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ success: true, message: t.copyPriceSettings.saved });
  } catch (error) {
    logger.error("copy price save failed", { error });
    return NextResponse.json({ error: t.copyPriceSettings.saveError }, { status: 500 });
  }
}
