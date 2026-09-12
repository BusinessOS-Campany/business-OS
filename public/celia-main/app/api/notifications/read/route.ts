import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db, schema } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.isRead, false));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("mark notifications read failed", { error });
    return NextResponse.json({ error: "MARK_READ_FAILED" }, { status: 500 });
  }
}
