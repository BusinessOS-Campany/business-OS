import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  note: z.string().max(500).default(""),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  const companyId = session.user.isSuperAdmin || permissions.has("transfer.manage") ? session.user.companyId : "";
  return { cred: { companyId, userId: session.user.id } };
}

export async function POST(request: Request) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    if (d.fromWarehouseId === d.toWarehouseId) return fail("same_warehouse", 400);

    const [from, to] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: d.fromWarehouseId, companyId: cred.companyId } }),
      prisma.warehouse.findFirst({ where: { id: d.toWarehouseId, companyId: cred.companyId } }),
    ]);
    if (!from || !to) return fail("warehouse_not_found", 400);

    const productIds = [...new Set(d.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { companyId: cred.companyId, id: { in: productIds } },
      select: { id: true, trackInventory: true, type: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    for (const it of d.items) {
      const p = productById.get(it.productId);
      if (!p) return fail(`product_not_found:${it.productId}`, 400);
      if (!p.trackInventory || p.type === "SERVICE") return fail(`not_tracked:${it.productId}`, 400);
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        companyId: cred.companyId,
        fromWarehouseId: d.fromWarehouseId,
        toWarehouseId: d.toWarehouseId,
        status: "REQUESTED",
        itemCount: d.items.length,
        createdById: cred.userId,
        note: d.note,
        items: { create: d.items.map((i) => ({ productId: i.productId, quantity: BigInt(i.quantity) })) },
      },
    });

    return created({ id: transfer.id });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("create transfer error", e);
    return serverError();
  }
}