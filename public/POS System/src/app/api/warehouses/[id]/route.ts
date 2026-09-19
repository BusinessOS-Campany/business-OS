import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const WhPatchSchema = z.object({
  name: z.string().trim().max(120).optional(),
  nameAr: z.string().trim().max(120).optional(),
  code: z.string().trim().min(1).max(30).optional(),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
  managerName: z.string().trim().max(120).optional(),
  isMain: z.boolean().optional(),
  status: z.string().optional(),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("warehouse.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = WhPatchSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const { isMain, ...rest } = parsed.data;

  try {
    const wh = await prisma.warehouse.findFirst({ where: { id, companyId: cred.companyId } });
    if (!wh) return notFound();
    if (rest.code && rest.code !== wh.code) {
      const dup = await prisma.warehouse.findUnique({ where: { companyId_code: { companyId: cred.companyId, code: rest.code } } });
      if (dup) return fail("code_exists", 400);
    }

    if (isMain === true && !wh.isMain) {
      await prisma.warehouse.updateMany({ where: { companyId: cred.companyId, isMain: true }, data: { isMain: false } });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(rest.name !== undefined ? { name: rest.name || rest.nameAr || wh.name } : {}),
        ...(rest.nameAr !== undefined ? { nameAr: rest.nameAr } : {}),
        ...(rest.code ? { code: rest.code } : {}),
        ...(rest.address !== undefined ? { address: rest.address } : {}),
        ...(rest.phone !== undefined ? { phone: rest.phone } : {}),
        ...(rest.managerName !== undefined ? { managerName: rest.managerName } : {}),
        ...(isMain !== undefined ? { isMain } : {}),
        ...(rest.status ? { status: rest.status } : {}),
      },
    });
    return ok({ data: { id: updated.id, code: updated.code } });
  } catch (e) {
    console.error("warehouse update error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  try {
    const wh = await prisma.warehouse.findFirst({ where: { id, companyId: cred.companyId } });
    if (!wh) return notFound();
    if (wh.isMain) return fail("in_use", 400);
    const [inv, tx] = await Promise.all([
      prisma.inventory.count({ where: { warehouseId: id } }),
      prisma.inventoryTransaction.count({ where: { warehouseId: id } }),
    ]);
    if (inv > 0 || tx > 0) return fail("in_use", 400);
    const linked = await prisma.branch.count({ where: { warehouseId: id } });
    if (linked > 0) return fail("in_use", 400);
    await prisma.warehouse.delete({ where: { id } });
    return ok({ data: { id } });
  } catch (e) {
    console.error("warehouse delete error", e);
    return serverError();
  }
}