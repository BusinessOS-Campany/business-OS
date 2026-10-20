import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { lineTotal } from "@/lib/money";
import { ok, fail, forbidden, notFound, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});

const UpdateSchema = z.object({
  supplierId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  warehouseId: z.string().optional(),
  expectedAt: z.string().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(ItemSchema).min(1).optional(),
});

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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  const { id } = await params;
  try {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, companyId: cred.companyId },
      include: {
        items: { include: { product: { select: { nameAr: true, nameEn: true, sku: true } } } },
        supplier: { select: { name: true, nameAr: true } },
        branch: { select: { name: true, nameAr: true } },
      },
    });
    if (!order) return notFound();
    return ok({
      data: {
        id: order.id, orderNo: order.orderNo, status: order.status, subtotal: Number(order.subtotal),
        discount: Number(order.discount), tax: Number(order.tax), total: Number(order.total),
        notes: order.notes, expectedAt: order.expectedAt?.toISOString() ?? null,
        supplierName: order.supplier.nameAr || order.supplier.name,
        branchName: order.branch.nameAr || order.branch.name,
        items: order.items.map((it) => ({
          id: it.id, productId: it.productId, name: it.product.nameAr || it.product.nameEn, sku: it.product.sku,
          quantity: Number(it.quantity), price: Number(it.price), total: Number(it.total), receivedQty: Number(it.receivedQty),
        })),
      },
    });
  } catch (e) {
    console.error("purchase order get error", e);
    return serverError();
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({ where: { id, companyId: cred.companyId } });
      if (!order) throw { code: "not_found" };
      if (order.status !== "DRAFT" && order.status !== "PENDING") throw { code: "invalid_state" };

      const data: Record<string, unknown> = {};
      if (d.notes !== undefined) data.notes = d.notes;
      if (d.expectedAt !== undefined) data.expectedAt = d.expectedAt ? new Date(d.expectedAt) : null;
      if (d.warehouseId !== undefined) data.warehouseId = d.warehouseId || null;

      if (d.supplierId) {
        const supplier = await tx.supplier.findFirst({ where: { id: d.supplierId, companyId: cred.companyId, isActive: true } });
        if (!supplier) throw { code: "invalid_fields" };
        data.supplierId = supplier.id;
      }
      if (d.branchId) {
        const branch = await tx.branch.findFirst({ where: { id: d.branchId, companyId: cred.companyId } });
        if (!branch) throw { code: "invalid_fields" };
        data.branchId = branch.id;
      }

      if (d.items) {
        const productIds = [...new Set(d.items.map((i) => i.productId))];
        const products = await tx.product.findMany({ where: { companyId: cred.companyId, id: { in: productIds } }, select: { id: true } });
        if (products.length !== productIds.length) throw { code: "invalid_fields" };
        const validIds = new Set(products.map((p) => p.id));

        let subtotal = 0;
        const lineRows = d.items.map((it) => {
          if (!validIds.has(it.productId)) throw { code: "invalid_fields" };
          const total = lineTotal(it.quantity, it.price);
          subtotal += total;
          return { productId: it.productId, quantity: BigInt(it.quantity), price: BigInt(it.price), total: BigInt(total) };
        });
        if (subtotal <= 0) throw { code: "invalid_fields" };

        await tx.purchaseOrderItem.deleteMany({ where: { orderId: id } });
        await tx.purchaseOrderItem.createMany({ data: lineRows.map((r) => ({ ...r, orderId: id })) });
        data.subtotal = BigInt(subtotal);
        data.total = BigInt(subtotal);
      }

      await tx.purchaseOrder.update({ where: { id }, data });

      await writeAudit(tx, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: "UPDATE",
        entity: "purchaseOrder",
        entityId: id,
        ip: getIp(request),
        oldValue: { status: order.status },
        newValue: data,
      });

      return { id };
    });

    return ok({ data: result });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e) {
      const code = (e as { code?: unknown }).code;
      if (code === "not_found") return notFound();
      if (code === "invalid_state") return fail("invalid_state", 400);
      if (code === "invalid_fields") return fail("invalid_fields", 400);
    }
    console.error("purchase order update error", e);
    return serverError();
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();
  const { id } = await params;
  try {
    const order = await prisma.purchaseOrder.findFirst({ where: { id, companyId: cred.companyId }, select: { id: true, status: true } });
    if (!order) return notFound();
    if (order.status !== "DRAFT" && order.status !== "CANCELLED") return fail("invalid_state", 400);
    await prisma.purchaseOrder.delete({ where: { id } });
    await writeAudit(prisma, {
      companyId: cred.companyId,
      userId: cred.userId,
      action: "DELETE",
      entity: "purchaseOrder",
      entityId: id,
      ip: getIp(request),
      oldValue: { status: order.status },
    });
    return ok({ data: { id } });
  } catch (e) {
    console.error("purchase order delete error", e);
    return serverError();
  }
}