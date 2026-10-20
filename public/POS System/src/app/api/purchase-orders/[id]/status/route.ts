import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { ok, fail, forbidden, notFound, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const Schema = z.object({ action: z.enum(["submit", "approve", "cancel"]) });

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("purchase.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId, userId: session.user.id } };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const { action } = parsed.data;

  try {
    const order = await prisma.purchaseOrder.findFirst({ where: { id, companyId: cred.companyId }, select: { id: true, status: true } });
    if (!order) return notFound();

    if (action === "submit") {
      if (order.status !== "DRAFT") return fail("invalid_state", 400);
      await prisma.purchaseOrder.update({ where: { id }, data: { status: "PENDING" } });
      await writeAudit(prisma, {
        companyId: cred.companyId, userId: cred.userId, action: "SUBMIT", entity: "purchaseOrder", entityId: id, ip: getIp(request),
        oldValue: { status: order.status }, newValue: { status: "PENDING" },
      });
      return ok({ data: { id, status: "PENDING" } });
    }

    if (action === "approve") {
      if (order.status !== "PENDING") return fail("invalid_state", 400);
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status: "APPROVED", approvedById: cred.userId, approvedAt: new Date() },
      });
      await writeAudit(prisma, {
        companyId: cred.companyId, userId: cred.userId, action: "APPROVE", entity: "purchaseOrder", entityId: id, ip: getIp(request),
        oldValue: { status: order.status }, newValue: { status: "APPROVED" },
      });
      return ok({ data: { id, status: "APPROVED" } });
    }

    if (order.status === "RECEIVED" || order.status === "PARTIALLY_RECEIVED") return fail("invalid_state", 400);
    await prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    await writeAudit(prisma, {
      companyId: cred.companyId, userId: cred.userId, action: "CANCEL", entity: "purchaseOrder", entityId: id, ip: getIp(request),
      oldValue: { status: order.status }, newValue: { status: "CANCELLED" },
    });
    return ok({ data: { id, status: "CANCELLED" } });
  } catch (e) {
    console.error("purchase order status error", e);
    return serverError();
  }
}