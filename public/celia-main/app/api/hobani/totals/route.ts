import { NextResponse } from "next/server";
import { getSession, requireApiPermission } from "@/lib/session";
import { getHobaniTotals } from "@/lib/hobani/totals";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { logger } from "@/lib/logger";

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

  try {
    const rows = await getHobaniTotals();
    return NextResponse.json({ rows });
  } catch (error) {
    logger.error("hobani totals fetch failed", { error });
    return NextResponse.json({ error: t.hobani.serverError }, { status: 500 });
  }
}
