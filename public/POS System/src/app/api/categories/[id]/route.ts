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
  const companyId = session.user.isSuperAdmin || permissions.has("category.manage") ? session.user.companyId : "";
  return { cred: { companyId } };
}

const patchSchema = z.object({
  name: z.string().trim().optional(),
  nameAr: z.string().trim().optional(),
  nameEn: z.string().trim().optional(),
  icon: z.string().trim().max(32).optional(),
  color: z.string().trim().max(16).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.category.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    if (d.name && d.name !== existing.name) {
      const dup = await prisma.category.findFirst({ where: { companyId: cred.companyId, name: d.name, id: { not: id } } });
      if (dup) return fail("exists", 400);
    }

    const data: Record<string, unknown> = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.nameAr !== undefined) data.nameAr = d.nameAr;
    if (d.nameEn !== undefined) data.nameEn = d.nameEn;
    if (d.icon !== undefined) data.icon = d.icon;
    if (d.color !== undefined) data.color = d.color;
    if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;
    if (d.isActive !== undefined) data.isActive = d.isActive;

    if (Object.keys(data).length > 0) {
      await prisma.category.update({ where: { id }, data: data as never });
    }

    return ok({ id });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("update category error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { cred } = await guard();
    if (!cred) return unauthorized();
    if (!cred.companyId) return forbidden();

    const { id } = await ctx.params;
    const existing = await prisma.category.findFirst({ where: { id, companyId: cred.companyId } });
    if (!existing) return notFound();

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) return fail("has_products", 400);

    await prisma.$transaction([
      prisma.subcategory.deleteMany({ where: { categoryId: id } }),
      prisma.category.delete({ where: { id } }),
    ]);

    return ok({ id });
  } catch (e) {
    console.error("delete category error", e);
    return serverError();
  }
}