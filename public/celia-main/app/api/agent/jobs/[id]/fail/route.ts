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
  const body = (await request.json().catch(() => null)) as {
    errorMessage?: string;
    transferredSize?: number;
    filesCount?: number;
  } | null;

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
        status: "FAILED",
        errorMessage: body?.errorMessage ?? "UNKNOWN_ERROR",
        currentSpeed: null,
        endTime: now,
        updatedAt: now,
        ...(body?.transferredSize != null ? { transferredSize: body.transferredSize } : {}),
        ...(body?.filesCount != null ? { transferredFiles: body.filesCount } : {}),
      })
      .where(eq(schema.transferJobs.id, id));

    await createNotification({
      type: "transfer",
      action: "fail",
      messageKey: "notifications.transferFailed",
      messageParams: { jobNo: job.jobNo },
      entityId: job.id,
      actorName: agent.name,
    });

    await logAudit({
      action: "TRANSFER_FAILED",
      entityType: "TRANSFER_JOB",
      entityId: id,
      metadata: { agentId: agent.agentId, errorMessage: body?.errorMessage ?? null },
    });
    logger.error("job failed", { agentId: agent.agentId, jobId: id, error: body?.errorMessage });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("job fail route failed", { error });
    return NextResponse.json({ error: "FAIL_FAILED" }, { status: 500 });
  }
}
