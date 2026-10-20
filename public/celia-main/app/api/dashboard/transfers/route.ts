import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { getDashboardTransferStats, failStaleTransfers } from "@/lib/transfers/queries";
import { getCopyRevenueCards } from "@/lib/dashboard/stats";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await failStaleTransfers();
    const [stats, revenue] = await Promise.all([getDashboardTransferStats(), getCopyRevenueCards()]);
    return NextResponse.json({ ...stats, revenue });
  } catch (error) {
    logger.error("get dashboard transfer stats failed", { error });
    return NextResponse.json({ error: "DASHBOARD_FAILED" }, { status: 500 });
  }
}
