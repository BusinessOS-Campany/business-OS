import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  nameAr: z.string().trim().optional(),
  nameEn: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  type: z.enum(["COMPANY", "INDIVIDUAL"]).optional(),
  phone: z.string().trim().max(32).optional(),
  phoneAlt: z.string().trim().max(32).optional(),
  email: z.string().trim().max(128).optional(),
  address: z.string().trim().max(255).optional(),
  governorate: z.string().trim().max(64).optional(),
  district: z.string().trim().max(64).optional(),
  contactPerson: z.string().trim().max(64).optional(),
  taxNumber: z.string().trim().max(64).optional(),
  paymentTerms: z.string().trim().max(128).optional(),
  creditLimit: z.number().int().nonnegative().optional(),
  openingBalance: z.number().int().nonnegative().optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  const companyId = session.user.isSuperAdmin || permissions.has("supplier.manage") ? session.user.companyId : "";
  return { cred: { companyId } };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.supplier.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    const strKeys = ["nameAr", "nameEn", "companyName", "phone", "phoneAlt", "email", "address", "governorate", "district", "contactPerson", "taxNumber", "paymentTerms"];
    for (const k of strKeys) {
      if (d[k as keyof typeof d] !== undefined) data[k] = d[k as never];
    }
    if (d.type !== undefined) data.type = d.type;
    if (d.creditLimit !== undefined) data.creditLimit = BigInt(d.creditLimit);
    if (d.openingBalance !== undefined) data.openingBalance = BigInt(d.openingBalance);
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.isActive !== undefined) data.isActive = d.isActive;

    if (d.nameAr !== undefined || d.nameEn !== undefined || d.companyName !== undefined) {
      const na = d.nameAr !== undefined ? d.nameAr : existing.nameAr;
      const ne = d.nameEn !== undefined ? d.nameEn : existing.nameEn;
      const cn = d.companyName !== undefined ? d.companyName : existing.companyName;
      data.nameAr = na;
      data.nameEn = ne;
      data.name = na || ne || cn || existing.name;
    }

    await prisma.supplier.update({ where: { id }, data: data as never });
    return ok({ id });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("update supplier error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.supplier.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const [purchases, orders, products] = await Promise.all([
      prisma.purchase.count({ where: { supplierId: id } }),
      prisma.purchaseOrder.count({ where: { supplierId: id } }),
      prisma.product.count({ where: { defaultSupplierId: id } }),
    ]);
    if (purchases + orders + products > 0) return fail("in_use", 400);

    await prisma.supplier.delete({ where: { id } });
    return ok({ id });
  } catch (e) {
    console.error("delete supplier error", e);
    return serverError();
  }
}