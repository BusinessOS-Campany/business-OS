import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

export const productSchema = z.object({
  nameAr: z.string().trim().default(""),
  nameEn: z.string().trim().default(""),
  sku: z.string().trim().max(64).optional().default(""),
  barcode: z.string().trim().max(64).optional().default(""),
  categoryId: z.string().nullable().optional().default(null),
  unitId: z.string().nullable().optional().default(null),
  type: z.enum(["NORMAL", "SERVICE", "WEIGHTED", "BUNDLE", "COMPOSITE"]).default("NORMAL"),
  cost: z.number().int().nonnegative().default(0),
  price: z.number().int().nonnegative().default(0),
  wholesalePrice: z.number().int().nonnegative().default(0),
  minPrice: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  openingStock: z.number().int().nonnegative().default(0),
  trackInventory: z.boolean().default(true),
  allowNegativeStock: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;

async function canManageId() {
  const session = await getSession();
  if (!session || !session.user.companyId) return null;
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  return session.user.isSuperAdmin || permissions.has("product.manage") ? session.user.companyId : "";
}

export async function POST(request: Request) {
  try {
    const companyId = await canManageId();
    if (companyId === null) return unauthorized();
    if (companyId === "") return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    if (!d.nameEn.trim() && !d.nameAr.trim()) {
      return fail("Invalid input", 400);
    }

    if (d.sku) {
      const dup = await prisma.product.findFirst({ where: { companyId, sku: d.sku } });
      if (dup) return fail("sku_exists", 400);
    }
    if (d.barcode) {
      const dup = await prisma.product.findFirst({ where: { companyId, barcode: d.barcode } });
      if (dup) return fail("barcode_exists", 400);
    }

    let sku = d.sku;
    if (!sku) {
      const count = await prisma.product.count({ where: { companyId } });
      sku = `SKU-${String(count + 1).padStart(4, "0")}`;
    }

    const product = await prisma.product.create({
      data: {
        companyId,
        sku,
        barcode: d.barcode,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        type: d.type,
        categoryId: d.categoryId,
        unitId: d.unitId,
        cost: BigInt(d.cost),
        price: BigInt(d.price),
        wholesalePrice: BigInt(d.wholesalePrice),
        minPrice: BigInt(d.minPrice),
        minStock: d.minStock / 1000,
        trackInventory: d.trackInventory,
        allowNegativeStock: d.allowNegativeStock,
        isFavorite: d.isFavorite,
        isActive: d.isActive,
      },
    });

    // Opening stock lands in the main warehouse + OPENING transaction
    if (d.trackInventory && d.openingStock > 0) {
      const main = await prisma.warehouse.findFirst({ where: { companyId, isMain: true } });
      if (main) {
        await prisma.inventory.upsert({
          where: { productId_warehouseId: { productId: product.id, warehouseId: main.id } },
          update: { quantity: { increment: BigInt(d.openingStock) } },
          create: { companyId, productId: product.id, warehouseId: main.id, quantity: BigInt(d.openingStock) },
        });
        await prisma.inventoryTransaction.create({
          data: {
            companyId,
            productId: product.id,
            warehouseId: main.id,
            type: "OPENING",
            quantity: BigInt(d.openingStock),
            unitAmount: BigInt(d.cost),
            totalAmount: BigInt(d.cost) * BigInt(d.openingStock) / 1000n,
            refType: "PRODUCT_CREATE",
            refId: product.id,
          },
        });
      }
    }

    if (d.barcode) {
      await prisma.productBarcode.create({
        data: { companyId, productId: product.id, barcode: d.barcode, isPrimary: true },
      });
    }

    return created({ id: product.id, sku: product.sku });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("create product error", e);
    return serverError();
  }
}