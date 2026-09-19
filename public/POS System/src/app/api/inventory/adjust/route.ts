import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const adjustSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  newQuantity: z.number().min(0), // major units
  type: z.enum(["ADJUSTMENT", "DAMAGE", "LOSS", "EXPIRY"]).default("ADJUSTMENT"),
  reason: z.string().trim().max(500).default(""),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user.companyId) return unauthorized();

    const permissions = new Set<string>();
    for (const ur of session.user.roles) {
      for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
    }
    if (!session.user.isSuperAdmin && !permissions.has("inventory.adjust")) return forbidden();

    const companyId = session.user.companyId;
    const body = await request.json().catch(() => null);
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    const [product, warehouse] = await Promise.all([
      prisma.product.findFirst({ where: { id: d.productId, companyId } }),
      prisma.warehouse.findFirst({ where: { id: d.warehouseId, companyId } }),
    ]);
    if (!product) return fail("product_not_found", 404);
    if (!warehouse) return fail("warehouse_not_found", 404);
    if (!product.trackInventory) return fail("not_tracked", 400);

    // newQuantity in major units -> thousandths for storage
    const newQty = BigInt(Math.round(d.newQuantity * 1000));

    const inv = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
    });
    const current = inv?.quantity ?? 0n;
    const delta = newQty - current;

    if (delta < 0n && !product.allowNegativeStock && newQty < 0n) return fail("invalid", 400);

    const result = await prisma.$transaction(async (tx) => {
      if (inv) {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: newQty },
        });
      } else {
        await tx.inventory.create({
          data: { companyId, productId: product.id, warehouseId: warehouse.id, quantity: newQty },
        });
      }

      if (delta !== 0n) {
        await tx.inventoryTransaction.create({
          data: {
            companyId,
            productId: product.id,
            warehouseId: warehouse.id,
            type: d.type,
            quantity: delta < 0n ? -delta : delta,
            unitAmount: product.cost,
            totalAmount: (delta < 0n ? -delta : delta) * product.cost / 1000n,
            refType: "ADJUST",
            refId: "",
            reason: d.reason,
            createdById: session.user.id,
          },
        });
      }

      return { delta: Number(delta) / 1000 };
    });

    return ok(result);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("inventory adjust error", e);
    return serverError();
  }
}