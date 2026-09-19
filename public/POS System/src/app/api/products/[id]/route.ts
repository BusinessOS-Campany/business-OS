import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  const companyId = session.user.isSuperAdmin || permissions.has("product.manage") ? session.user.companyId : "";
  return { cred: { userId: session.user.id, companyId } };
}

const patchSchema = z.object({
  nameAr: z.string().trim().optional(),
  nameEn: z.string().trim().optional(),
  sku: z.string().trim().max(64).optional(),
  barcode: z.string().trim().max(64).optional(),
  categoryId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  type: z.enum(["NORMAL", "SERVICE", "WEIGHTED", "BUNDLE", "COMPOSITE"]).optional(),
  cost: z.number().int().nonnegative().optional(),
  price: z.number().int().nonnegative().optional(),
  wholesalePrice: z.number().int().nonnegative().optional(),
  minPrice: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  trackInventory: z.boolean().optional(),
  allowNegativeStock: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.product.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    if (d.sku && d.sku !== existing.sku) {
      const dup = await prisma.product.findFirst({ where: { companyId: cred.companyId, sku: d.sku, id: { not: id } } });
      if (dup) return fail("sku_exists", 400);
    }
    if (d.barcode && d.barcode !== existing.barcode) {
      const dup = await prisma.product.findFirst({ where: { companyId: cred.companyId, barcode: d.barcode, id: { not: id } } });
      if (dup) return fail("barcode_exists", 400);
    }

    const data: Record<string, unknown> = {};
    const fullKeys = ["nameAr", "nameEn", "sku", "barcode", "type", "trackInventory", "allowNegativeStock", "isFavorite", "isActive"];
    for (const k of fullKeys) {
      if (d[k as keyof typeof d] !== undefined) data[k] = d[k as never];
    }
    if (d.categoryId !== undefined) data.categoryId = d.categoryId;
    if (d.unitId !== undefined) data.unitId = d.unitId;
    const moneyKeys = ["cost", "price", "wholesalePrice", "minPrice"] as const;
    for (const k of moneyKeys) {
      if (d[k] !== undefined) data[k] = BigInt(d[k]!);
    }
    if (d.minStock !== undefined) data.minStock = d.minStock / 1000;

    if (Object.keys(data).length > 0) {
      await prisma.product.update({ where: { id }, data: data as never });
    }

    return ok({ id });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("update product error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.product.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const [saleItems, purchaseItems, invTx, stockTransferItems] = await Promise.all([
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.purchaseItem.count({ where: { productId: id } }),
      prisma.inventoryTransaction.count({ where: { productId: id } }),
      prisma.stockTransferItem.count({ where: { productId: id } }),
    ]);
    if (saleItems + purchaseItems + invTx + stockTransferItems > 0) {
      return fail("in_use", 400);
    }

    await prisma.$transaction([
      prisma.inventory.deleteMany({ where: { productId: id } }),
      prisma.productBarcode.deleteMany({ where: { productId: id } }),
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.productPrice.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return ok({ id });
  } catch (e) {
    console.error("delete product error", e);
    return serverError();
  }
}