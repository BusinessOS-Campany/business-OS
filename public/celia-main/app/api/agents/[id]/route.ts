import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { getAgentById, assignAgentShare } from "@/lib/transfers/queries";
import { logAudit } from "@/lib/transfers/audit";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const agent = await getAgentById(id);
    if (!agent) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ agent });
  } catch (error) {
    logger.error("get agent failed", { error });
    return NextResponse.json({ error: "AGENT_FETCH_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (
    body.nasShareId !== undefined &&
    body.nasShareId !== null &&
    typeof body.nasShareId !== "string"
  ) {
    return NextResponse.json({ error: "INVALID_SHARE" }, { status: 400 });
  }
  const nasShareId =
    typeof body.nasShareId === "string" && body.nasShareId ? body.nasShareId : null;

  try {
    const updated = await assignAgentShare(id, nasShareId);
    if (!updated) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const assignedAgent = await getAgentById(id);

    await createNotification({
      type: "agent",
      action: "assignShare",
      messageKey: "notifications.agentShareAssigned",
      messageParams: { name: assignedAgent?.name ?? id },
      entityId: id,
      actorId: user.id,
      actorName: user.name,
    });

    await logAudit({
      action: "AGENT_SHARE_ASSIGNED",
      entityType: "TRANSFER_AGENT",
      entityId: id,
      userId: user.id,
      metadata: { nasShareId },
    });
    return NextResponse.json({ ok: true, agentId: id, nasShareId });
  } catch (error) {
    logger.error("assign agent share failed", { error });
    return NextResponse.json({ error: "AGENT_UPDATE_FAILED" }, { status: 500 });
  }
}
