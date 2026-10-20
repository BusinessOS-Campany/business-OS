import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { getAuditLogs } from "@/lib/transfers/queries";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));

  try {
    const logs = await getAuditLogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    logger.error("get audit log failed", { error });
    return NextResponse.json({ error: "AUDIT_LOG_FAILED" }, { status: 500 });
  }
}
