import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAgent } from "@/lib/transfers/agent-auth";
import { logAudit } from "@/lib/transfers/audit";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: Context) {
  const agent = await requireAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { jobNo?: number } | null;

  try {
    const [job] = await db
      .select({ id: schema.transferJobs.id, jobNo: schema.transferJobs.jobNo })
      .from(schema.transferJobs)
      .where(and(eq(schema.transferJobs.id, id), eq(schema.transferJobs.agentId, agent.agentId)));

    if (!job) {
      return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
    }

    const now = new Date();
    await db
      .update(schema.transferJobs)
      .set({
        status: "RUNNING",
        startTime: now,
        errorMessage: null,
      })
      .where(eq(schema.transferJobs.id, id));

    await createNotification({
      type: "transfer",
      action: "start",
      messageKey: "notifications.transferStarted",
      messageParams: { jobNo: job.jobNo },
      entityId: job.id,
      actorName: agent.name,
    });

    await logAudit({
      action: "TRANSFER_STARTED",
      entityType: "TRANSFER_JOB",
      entityId: id,
      metadata: { agentId: agent.agentId, jobNo: body?.jobNo },
    });
    logger.info("job started", { agentId: agent.agentId, jobId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("job start failed", { error });
    return NextResponse.json({ error: "START_FAILED" }, { status: 500 });
  }
}
