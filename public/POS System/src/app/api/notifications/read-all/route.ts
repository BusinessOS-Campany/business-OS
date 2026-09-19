import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { ok, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session || !session.user.companyId) return unauthorized();
  try {
    await prisma.notification.updateMany({
      where: { companyId: session.user.companyId, userId: session.user.id, read: false },
      data: { read: true },
    });
    return ok({ data: { marked: true } });
  } catch (e) {
    console.error("notifications mark all read error", e);
    return serverError();
  }
}