import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { ok, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("audit.view")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function GET() {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  try {
    const rows = await prisma.auditLog.findMany({
      where: { companyId: cred.companyId },
      select: {
        id: true, action: true, entity: true, entityId: true, ip: true, oldValue: true, newValue: true, createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok({
      data: rows.map((r) => ({
        id: r.id, action: r.action, entity: r.entity, entityId: r.entityId, ip: r.ip,
        oldValue: r.oldValue, newValue: r.newValue, createdAt: r.createdAt.toISOString(), userName: r.user?.name ?? "",
      })),
    });
  } catch (e) {
    console.error("audit list error", e);
    return serverError();
  }
}