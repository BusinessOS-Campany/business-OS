import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAgent } from "@/lib/transfers/agent-auth";
import { MANUAL_COPY_MARKER } from "@/lib/transfers/constants";
import { logAudit } from "@/lib/transfers/audit";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface ManualTransferPayload {
  deviceId?: string;
  nasShareId?: string | null;
  sourcePath?: string;
  destinationPath?: string;
  transferredSize?: number;
  filesCount?: number;
  accumulate?: boolean;
}

export async function POST(request: Request) {
  const agent = await requireAgent(request);
  if (!agent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ManualTransferPayload | null;
  const deviceId = body?.deviceId?.trim();
  const sourcePath = body?.sourcePath?.trim();
  const destinationPath = body?.destinationPath?.trim();
  if (!deviceId || !sourcePath || !destinationPath) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const transferredSize = Number.isFinite(Number(body?.transferredSize))
    ? Math.max(0, Number(body?.transferredSize))
    : 0;
  const filesCount = Number.isFinite(Number(body?.filesCount))
    ? Math.max(0, Number(body?.filesCount))
    : 0;

  try {
    const [device] = await db
      .select({ id: schema.transferDevices.id })
      .from(schema.transferDevices)
      .where(
        and(
          eq(schema.transferDevices.agentId, agent.agentId),
          eq(schema.transferDevices.deviceId, deviceId),
        ),
      );

    if (!device) {
      return NextResponse.json({ error: "DEVICE_NOT_FOUND" }, { status: 404 });
    }

    const dupWindow = new Date(Date.now() - 10 * 60 * 1000);
    const [duplicate] = await db
      .select({ id: schema.transferJobs.id })
      .from(schema.transferJobs)
      .where(
        and(
          eq(schema.transferJobs.agentId, agent.agentId),
          eq(schema.transferJobs.destinationPath, destinationPath),
          eq(schema.transferJobs.status, "COMPLETED"),
          eq(schema.transferJobs.transferredSize, transferredSize),
          eq(schema.transferJobs.transferredFiles, filesCount),
          gte(schema.transferJobs.createdAt, dupWindow),
        ),
      )
      .limit(1);
    if (duplicate) {
      return NextResponse.json({ job: { id: duplicate.id }, duplicate: true }, { status: 200 });
    }

    if (body?.accumulate !== false) {
      const recentWindow = new Date(Date.now() - 30 * 60 * 1000);
      const [recent] = await db
        .select({
          id: schema.transferJobs.id,
          transferredSize: schema.transferJobs.transferredSize,
          transferredFiles: schema.transferJobs.transferredFiles,
          totalSize: schema.transferJobs.totalSize,
        })
        .from(schema.transferJobs)
        .where(
          and(
            eq(schema.transferJobs.agentId, agent.agentId),
            eq(schema.transferJobs.destinationPath, destinationPath),
            eq(schema.transferJobs.customerNotes, MANUAL_COPY_MARKER),
            eq(schema.transferJobs.status, "COMPLETED"),
            gte(schema.transferJobs.createdAt, recentWindow),
          ),
        )
        .orderBy(desc(schema.transferJobs.createdAt))
        .limit(1);
      if (recent) {
        const [job] = await db
          .update(schema.transferJobs)
          .set({
            transferredSize: (recent.transferredSize ?? 0) + transferredSize,
            transferredFiles: (recent.transferredFiles ?? 0) + filesCount,
            totalSize: (recent.totalSize ?? 0) + transferredSize,
            endTime: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.transferJobs.id, recent.id))
          .returning({ id: schema.transferJobs.id, jobNo: schema.transferJobs.jobNo });

        await logAudit({
          action: "TRANSFER_MANUAL_UPDATED",
          entityType: "TRANSFER_JOB",
          entityId: job.id,
          metadata: {
            agentId: agent.agentId,
            destinationPath,
            transferredSize,
            filesCount,
          },
        });
        return NextResponse.json({ job, updated: true }, { status: 200 });
      }
    }

    const now = new Date();
    const [job] = await db
      .insert(schema.transferJobs)
      .values({
        agentId: agent.agentId,
        deviceId: device.id,
        nasShareId: body?.nasShareId?.trim() || null,
        sourcePath: sourcePath.slice(0, 500),
        destinationPath: destinationPath.slice(0, 500),
        customerNotes: MANUAL_COPY_MARKER,
        status: "COMPLETED",
        totalSize: transferredSize,
        transferredSize,
        fileCount: filesCount,
        transferredFiles: filesCount,
        startTime: now,
        endTime: now,
        durationSeconds: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: schema.transferJobs.id, jobNo: schema.transferJobs.jobNo });

    await createNotification({
      type: "transfer",
      action: "manual",
      messageKey: "notifications.manualCopyAdded",
      messageParams: { jobNo: job.jobNo },
      entityId: job.id,
      actorName: agent.name,
    });

    await logAudit({
      action: "TRANSFER_MANUAL_DETECTED",
      entityType: "TRANSFER_JOB",
      entityId: job.id,
      metadata: {
        agentId: agent.agentId,
        sourcePath,
        destinationPath,
        transferredSize,
        filesCount,
      },
    });
    logger.info("manual copy recorded", { agentId: agent.agentId, jobId: job.id, jobNo: job.jobNo });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    logger.error("manual transfer record failed", { error });
    return NextResponse.json({ error: "MANUAL_RECORD_FAILED" }, { status: 500 });
  }
}
