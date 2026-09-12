import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { getTransferJobs, failStaleTransfers } from "@/lib/transfers/queries";
import type { TransferFilters } from "@/lib/transfers/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"] as const;

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const filters: TransferFilters = {
    status: statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as TransferFilters["status"])
      : undefined,
    agentId: url.searchParams.get("agentId") ?? undefined,
    deviceId: url.searchParams.get("deviceId") ?? undefined,
    customer: url.searchParams.get("customer") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    limit: Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50)),
    offset: Math.max(0, Number(url.searchParams.get("offset")) || 0),
  };

  try {
    await failStaleTransfers();
    const result = await getTransferJobs(filters);
    return NextResponse.json({ jobs: result });
  } catch (error) {
    logger.error("get transfers failed", { error });
    return NextResponse.json({ error: "TRANSFERS_FETCH_FAILED" }, { status: 500 });
  }
}
