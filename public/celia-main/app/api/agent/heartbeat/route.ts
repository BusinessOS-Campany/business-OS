import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAgent } from "@/lib/transfers/agent-auth";
import { getActiveSharesWithSecret } from "@/lib/transfers/nas";
import { failStaleTransfers } from "@/lib/transfers/queries";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const agent = await requireAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const reportedStatus = body?.status ?? "ONLINE";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    const [row] = await db
      .select({ status: schema.transferAgents.status })
      .from(schema.transferAgents)
      .where(eq(schema.transferAgents.agentId, agent.agentId));

    await db
      .update(schema.transferAgents)
      .set({
        status: reportedStatus === "ONLINE" ? "ONLINE" : "OFFLINE",
        lastHeartbeat: new Date(),
        ipAddress: ip,
        updatedAt: new Date(),
      })
      .where(eq(schema.transferAgents.agentId, agent.agentId));

    if (row?.status !== "ONLINE" && reportedStatus === "ONLINE") {
      logger.info("agent connected", { agentId: agent.agentId });
    }

    await failStaleTransfers().catch((error) => {
      logger.warn("stale transfer sweep failed during heartbeat", { error });
    });

    const shares = await getActiveSharesWithSecret();
    return NextResponse.json({ ok: true, shares });
  } catch (error) {
    logger.error("agent heartbeat failed", { error });
    return NextResponse.json({ error: "HEARTBEAT_FAILED" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const agent = await requireAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const failed = await failStaleTransfers();
    return NextResponse.json({ ok: true, failed });
  } catch (error) {
    logger.error("stale transfer sweep failed", { error });
    return NextResponse.json({ error: "SWEEP_FAILED" }, { status: 500 });
  }
}
