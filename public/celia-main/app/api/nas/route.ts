import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { listNasShares, createNasShare } from "@/lib/transfers/nas";
import { logAudit } from "@/lib/transfers/audit";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const shares = await listNasShares();
    return NextResponse.json({ shares });
  } catch (error) {
    logger.error("list nas shares failed", { error });
    return NextResponse.json({ error: "SHARES_FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const host = typeof body.host === "string" ? body.host.trim() : "";
  const share = typeof body.share === "string" ? body.share.trim() : "";
  if (!name || !host || !share) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  try {
    const created = await createNasShare({
      name,
      host,
      protocol: typeof body.protocol === "string" && body.protocol ? body.protocol : "SMB",
      share,
      username: typeof body.username === "string" && body.username ? body.username : null,
      password: typeof body.password === "string" && body.password ? body.password : null,
      basePath: typeof body.basePath === "string" && body.basePath ? body.basePath : null,
      isActive: body.isActive !== false,
    });

    await createNotification({
      type: "nasShare",
      action: "add",
      messageKey: "notifications.nasShareAdded",
      messageParams: { name: created.name },
      entityId: created.id,
      actorId: user.id,
      actorName: user.name,
    });

    await logAudit({
      action: "NAS_SHARE_CREATED",
      entityType: "NAS_SHARE",
      entityId: created.id,
      userId: user.id,
      metadata: { name: created.name, host: created.host, share: created.share },
    });
    logger.info("nas share created", { shareId: created.id, userId: user.id });
    return NextResponse.json({ share: created }, { status: 201 });
  } catch (error) {
    logger.error("create nas share failed", { error });
    return NextResponse.json({ error: "SHARE_CREATE_FAILED" }, { status: 500 });
  }
}
