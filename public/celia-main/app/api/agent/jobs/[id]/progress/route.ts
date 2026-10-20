import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAgent } from "@/lib/transfers/agent-auth";
import { logger } from "@/lib/logger";

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
    transferredSize?: number;
    filesCount?: number;
    currentSpeed?: number;
  } | null;

  try {
    const [job] = await db
      .select({
        id: schema.transferJobs.id,
        status: schema.transferJobs.status,
        cancelRequestedAt: schema.transferJobs.cancelRequestedAt,
      })
      .from(schema.transferJobs)
      .where(and(eq(schema.transferJobs.id, id), eq(schema.transferJobs.agentId, agent.agentId)));

    if (!job) {
      return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
    }

    const currentSpeed = body?.currentSpeed ?? null;
    await db
      .update(schema.transferJobs)
      .set({
        currentSpeed,
        updatedAt: new Date(),
        ...(body?.transferredSize != null ? { transferredSize: body.transferredSize } : {}),
        ...(body?.filesCount != null ? { transferredFiles: body.filesCount } : {}),
      })
      .where(eq(schema.transferJobs.id, id));

    return NextResponse.json({
      ok: true,
      status: job.status,
      cancelRequested: Boolean(job.cancelRequestedAt),
    });
  } catch (error) {
    logger.error("job progress failed", { error });
    return NextResponse.json({ error: "PROGRESS_FAILED" }, { status: 500 });
  }
}
