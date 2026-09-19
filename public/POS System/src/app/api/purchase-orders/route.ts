import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { lineTotal } from "@/lib/money";
import { ok, created, fail, forbidden, unauthorized, getIp, serverError, zodErrors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});

const CreateSchema = z.object({
  supplierId: z.string().min(1),
  branchId: z.string().min(1),
  warehouseId: z.string().optional().default(""),
  expectedAt: z.string().optional().default(""),
  notes: z.string().max(500).default(""),
  items: z.array(ItemSchema).min(1),
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

export async function GET() {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { companyId: cred.companyId },
      select: {
        id: true, orderNo: true, status: true, total: true, expectedAt: true, notes: true, createdAt: true,
        supplier: { select: { name: true, nameAr: true } },
        branch: { select: { name: true, nameAr: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok({
      data: orders.map((o) => ({
        id: o.id, orderNo: o.orderNo, status: o.status, total: Number(o.total),
        expectedAt: o.expectedAt?.toISOString() ?? null, notes: o.notes, createdAt: o.createdAt.toISOString(),
        supplierName: o.supplier.nameAr || o.supplier.name, branchName: o.branch.nameAr || o.branch.name,
        itemCount: o._count.items,
      })),
    });
  } catch (e) {
    console.error("purchase orders list error", e);
    return serverError();
  }
}

export async function POST(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(cast(hashtext(${cred.companyId}) as bigint))`;

      const supplier = await tx.supplier.findFirst({ where: { id: d.supplierId, companyId: cred.companyId, isActive: true } });
      if (!supplier) throw { code: "invalid_fields" };
      const branch = await tx.branch.findFirst({ where: { id: d.branchId, companyId: cred.companyId } });
      if (!branch) throw { code: "invalid_fields" };

      let warehouseId: string | null = d.warehouseId || null;
      if (warehouseId) {
        const wh = await tx.warehouse.findFirst({ where: { id: warehouseId, companyId: cred.companyId } });
        if (!wh) throw { code: "invalid_fields" };
      } else {
        warehouseId = branch.warehouseId ?? null;
      }

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

      const existing = await tx.purchaseOrder.findMany({ where: { companyId: cred.companyId }, select: { orderNo: true } });
      let maxNo = 0;
      for (const o of existing) {
        const m = /^ORD-(\d+)$/.exec(o.orderNo);
        if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10));
      }
      const orderNo = `ORD-${String(maxNo + 1).padStart(6, "0")}`;

      const order = await tx.purchaseOrder.create({
        data: {
          companyId: cred.companyId,
          branchId: branch.id,
          supplierId: supplier.id,
          warehouseId,
          orderNo,
          status: "DRAFT",
          subtotal: BigInt(subtotal),
          discount: 0n,
          tax: 0n,
          total: BigInt(subtotal),
          expectedAt: d.expectedAt ? new Date(d.expectedAt) : null,
          notes: d.notes,
          createdById: cred.userId,
          items: { create: lineRows },
        },
      });

      await writeAudit(tx, {
        companyId: cred.companyId,
        userId: cred.userId,
        action: "CREATE",
        entity: "purchaseOrder",
        entityId: order.id,
        ip: getIp(request),
        newValue: { orderNo: order.orderNo, total: Number(order.total), supplierId: order.supplierId },
      });

      return { id: order.id, orderNo: order.orderNo, total: Number(order.total) };
    });

    return created({ data: result });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: unknown }).code === "invalid_fields") {
      return fail("invalid_fields", 400);
    }
    console.error("purchase order create error", e);
    return serverError();
  }
}