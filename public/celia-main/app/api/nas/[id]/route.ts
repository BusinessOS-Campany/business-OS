import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { updateNasShare, deleteNasShare } from "@/lib/transfers/nas";
import { logAudit } from "@/lib/transfers/audit";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
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

  try {
    const updated = await updateNasShare(id, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      host: typeof body.host === "string" ? body.host.trim() : undefined,
      protocol: typeof body.protocol === "string" && body.protocol ? body.protocol : undefined,
      share: typeof body.share === "string" ? body.share.trim() : undefined,
      username: typeof body.username === "string" ? body.username : undefined,
      password: typeof body.password === "string" && body.password ? body.password : undefined,
      basePath: typeof body.basePath === "string" ? body.basePath : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await createNotification({
      type: "nasShare",
      action: "update",
      messageKey: "notifications.nasShareUpdated",
      messageParams: { name: updated.name },
      entityId: id,
      actorId: user.id,
      actorName: user.name,
    });

    await logAudit({
      action: "NAS_SHARE_UPDATED",
      entityType: "NAS_SHARE",
      entityId: id,
      userId: user.id,
    });
    return NextResponse.json({ share: updated });
  } catch (error) {
    logger.error("update nas share failed", { error });
    return NextResponse.json({ error: "SHARE_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const deleted = await deleteNasShare(id);
    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await createNotification({
      type: "nasShare",
      action: "delete",
      messageKey: "notifications.nasShareDeleted",
      entityId: id,
      actorId: user.id,
      actorName: user.name,
    });

    await logAudit({
      action: "NAS_SHARE_DELETED",
      entityType: "NAS_SHARE",
      entityId: id,
      userId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("delete nas share failed", { error });
    return NextResponse.json({ error: "SHARE_DELETE_FAILED" }, { status: 500 });
  }
}
