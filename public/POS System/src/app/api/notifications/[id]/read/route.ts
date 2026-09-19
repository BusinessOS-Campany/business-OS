import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { ok, notFound, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.user.companyId) return unauthorized();
  const { id } = await params;
  try {
    const updated = await prisma.notification.updateMany({
      where: { id, companyId: session.user.companyId, userId: session.user.id },
      data: { read: true },
    });
    if (updated.count === 0) return notFound();
    return ok({ data: { id, read: true } });
  } catch (e) {
    console.error("notification read error", e);
    return serverError();
  }
}