import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  nameAr: z.string().trim().optional(),
  nameEn: z.string().trim().optional(),
  phone: z.string().trim().max(32).optional(),
  phoneAlt: z.string().trim().max(32).optional(),
  email: z.string().trim().max(128).optional(),
  address: z.string().trim().max(255).optional(),
  governorate: z.string().trim().max(64).optional(),
  district: z.string().trim().max(64).optional(),
  type: z.enum(["WALK_IN", "RETAIL", "WHOLESALE", "VIP", "CREDIT"]).optional(),
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
  const companyId = session.user.isSuperAdmin || permissions.has("customer.manage") ? session.user.companyId : "";
  return { cred: { companyId } };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.customer.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    const strKeys = ["nameAr", "nameEn", "phone", "phoneAlt", "email", "address", "governorate", "district"];
    for (const k of strKeys) {
      if (d[k as keyof typeof d] !== undefined) data[k] = d[k as never];
    }
    if (d.type !== undefined) data.type = d.type;
    if (d.creditLimit !== undefined) data.creditLimit = BigInt(d.creditLimit);
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.isActive !== undefined) data.isActive = d.isActive;

    // Opening balance changes shift the running balance by the same delta.
    if (d.openingBalance !== undefined) {
      const delta = BigInt(d.openingBalance) - existing.openingBalance;
      data.openingBalance = BigInt(d.openingBalance);
      data.balance = existing.balance + delta;
    }

    if (d.nameAr !== undefined || d.nameEn !== undefined) {
      const na = d.nameAr !== undefined ? d.nameAr : existing.nameAr;
      const ne = d.nameEn !== undefined ? d.nameEn : existing.nameEn;
      data.nameAr = na;
      data.nameEn = ne;
      data.name = na || ne || existing.name;
    }

    await prisma.customer.update({ where: { id }, data: data as never });

    return ok({ id });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("update customer error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.customer.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const [sales, returns] = await Promise.all([
      prisma.sale.count({ where: { customerId: id } }),
      prisma.saleReturn.count({ where: { customerId: id } }),
    ]);
    if (sales + returns > 0) return fail("in_use", 400);

    await prisma.customer.delete({ where: { id } });
    return ok({ id });
  } catch (e) {
    console.error("delete customer error", e);
    return serverError();
  }
}