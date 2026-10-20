import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAgent } from "@/lib/transfers/agent-auth";
import { fullSourcePath } from "@/lib/transfers/nas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const agent = await requireAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(schema.transferJobs)
      .where(
        and(
          eq(schema.transferJobs.agentId, agent.agentId),
          eq(schema.transferJobs.status, "PENDING"),
        ),
      )
      .orderBy(asc(schema.transferJobs.createdAt))
      .limit(1);

    const job = rows[0];
    if (!job) {
      return NextResponse.json({ job: null });
    }

    const [share] = job.nasShareId
      ? await db
          .select({
            id: schema.nasShares.id,
            name: schema.nasShares.name,
            host: schema.nasShares.host,
            sharePath: schema.nasShares.share,
            basePath: schema.nasShares.basePath,
          })
          .from(schema.nasShares)
          .where(eq(schema.nasShares.id, job.nasShareId))
      : [];

    logger.info("agent fetched job", { agentId: agent.agentId, jobId: job.id });
    return NextResponse.json({
      job: {
        ...job,
        sourcePath: share
          ? fullSourcePath(
              { host: share.host, share: share.sharePath, basePath: share.basePath },
              job.sourcePath,
            )
          : job.sourcePath,
        nasShare: share,
      },
    });
  } catch (error) {
    logger.error("agent fetch next job failed", { error });
    return NextResponse.json({ error: "JOBS_FAILED" }, { status: 500 });
  }
}
