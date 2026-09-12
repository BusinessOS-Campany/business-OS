import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { requireApiUser } from "@/lib/transfers/api-auth";
import { db, schema } from "@/lib/db";
import { listServerShares } from "@/lib/transfers/smb";
import { logAudit } from "@/lib/transfers/audit";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function normalizeHost(input: string): string {
  return input.replace(/\\+/g, "").replace(/^\/+|\/+$/g, "").trim();
}

export async function POST(request: Request) {
  if (process.platform !== "win32") {
    return NextResponse.json(
      { error: "PLATFORM_NOT_SUPPORTED", message: "Server discovery requires a Windows machine on the same LAN as the NAS." },
      { status: 501 },
    );
  }

  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { host?: string } | null;
  const host = normalizeHost(body?.host ?? "");
  if (!host) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  try {
    const discovered = await listServerShares(host);
    if (discovered.length === 0) {
      return NextResponse.json(
        { error: "NO_SHARES_FOUND", host },
        { status: 404 },
      );
    }

    const existing = await db
      .select({ id: schema.nasShares.id, share: schema.nasShares.share, name: schema.nasShares.name })
      .from(schema.nasShares)
      .where(eq(schema.nasShares.host, host));

    const existingShares = new Set(existing.map((item) => item.share.toLowerCase()));
    const toCreate = discovered.filter((share) => !existingShares.has(share.toLowerCase()));

    if (toCreate.length > 0) {
      await db.insert(schema.nasShares).values(
        toCreate.map((share) => ({
          name: share,
          host,
          protocol: "SMB",
          share,
          username: null,
          passwordEnc: null,
          basePath: null,
          isActive: true,
        })),
      );
    }

    const toReactivate = existing.filter((item) =>
      discovered.some((share) => share.toLowerCase() === item.share.toLowerCase()),
    );
    if (toReactivate.length > 0) {
      await db
        .update(schema.nasShares)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          inArray(
            schema.nasShares.id,
            toReactivate.map((item) => item.id),
          ),
        );
    }

    await createNotification({
      type: "nasShare",
      action: "add",
      messageKey: "notifications.nasServerAdded",
      messageParams: { host },
      actorId: user.id,
      actorName: user.name,
      metadata: { host, discovered, created: toCreate.length },
    });

    await logAudit({
      action: "NAS_SERVER_ADDED",
      entityType: "NAS_SHARE",
      userId: user.id,
      metadata: { host, discovered },
    });
    logger.info("nas server added", { host, shares: discovered.length, userId: user.id });

    const shares = await db
      .select()
      .from(schema.nasShares)
      .where(eq(schema.nasShares.host, host))
      .orderBy(schema.nasShares.share);

    return NextResponse.json({ ok: true, host, discovered, shares }, { status: 201 });
  } catch (error) {
    logger.error("nas server discovery failed", { host, error });
    return NextResponse.json(
      { error: "DISCOVERY_FAILED", message: String(error instanceof Error ? error.message : error) },
      { status: 502 },
    );
  }
}
