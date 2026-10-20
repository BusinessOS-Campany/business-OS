import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/lib/session";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = isLocale(acceptLanguage) ? acceptLanguage : "ar";
  const t = getDictionary(locale);
  if (!session) {
    return NextResponse.json({ message: t.hobani.unauthorized }, { status: 401 });
  }

  const guard = await requireApiPermission(session.user.id, session.user.role, "dashboard");
  if (!guard.allowed) return guard.response;

  const stats = await getDashboardStats();
  return NextResponse.json(stats);
}
