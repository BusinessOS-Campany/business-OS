import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAgent } from "@/lib/transfers/agent-auth";
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

  try {
    const [job] = await db
      .select({ id: schema.transferJobs.id, jobNo: schema.transferJobs.jobNo, startTime: schema.transferJobs.startTime })
      .from(schema.transferJobs)
      .where(and(eq(schema.transferJobs.id, id), eq(schema.transferJobs.agentId, agent.agentId)));

    if (!job) {
      return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
    }

    const now = new Date();
    const durationSeconds = job.startTime
      ? Math.round((now.getTime() - new Date(job.startTime).getTime()) / 1000)
      : null;
    await db
      .update(schema.transferJobs)
      .set({
        status: "CANCELLED",
        endTime: now,
        currentSpeed: null,
        durationSeconds,
        updatedAt: now,
      })
      .where(eq(schema.transferJobs.id, id));

    await createNotification({
      type: "transfer",
      action: "cancel",
      messageKey: "notifications.transferCancelled",
      messageParams: { jobNo: job.jobNo },
      entityId: job.id,
      actorName: agent.name,
    });

    logger.info("job cancelled by agent", { agentId: agent.agentId, jobId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("job cancel (agent) failed", { error });
    return NextResponse.json({ error: "CANCEL_FAILED" }, { status: 500 });
  }
}
