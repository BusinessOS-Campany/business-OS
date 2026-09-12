import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const unreadOnly = searchParams.get("filter") === "unread";

    const where = unreadOnly ? eq(schema.notifications.isRead, false) : undefined;

    const rows = await db
      .select({
        id: schema.notifications.id,
        type: schema.notifications.type,
        action: schema.notifications.action,
        messageKey: schema.notifications.messageKey,
        messageParams: schema.notifications.messageParams,
        entityId: schema.notifications.entityId,
        actorName: schema.notifications.actorName,
        isRead: schema.notifications.isRead,
        createdAt: schema.notifications.createdAt,
      })
      .from(schema.notifications)
      .where(where)
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [unread] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(eq(schema.notifications.isRead, false));

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(where);

    return NextResponse.json({
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      unreadCount: unread?.count ?? 0,
      total: total?.count ?? 0,
    });
  } catch (error) {
    logger.error("get notifications failed", { error });
    return NextResponse.json({ error: "NOTIFICATIONS_FETCH_FAILED" }, { status: 500 });
  }
}
