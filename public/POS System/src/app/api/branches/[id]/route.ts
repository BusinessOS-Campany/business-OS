import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const BranchPatchSchema = z.object({
  name: z.string().trim().max(120).optional(),
  nameAr: z.string().trim().max(120).optional(),
  code: z.string().trim().min(1).max(30).optional(),
  phone: z.string().trim().max(30).optional(),
  managerName: z.string().trim().max(120).optional(),
  address: z.string().trim().max(255).optional(),
  warehouseId: z.string().nullable().optional(),
  status: z.string().optional(),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("branch.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = BranchPatchSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const branch = await prisma.branch.findFirst({ where: { id, companyId: cred.companyId } });
    if (!branch) return notFound();
    if (d.code && d.code !== branch.code) {
      const dup = await prisma.branch.findUnique({ where: { companyId_code: { companyId: cred.companyId, code: d.code } } });
      if (dup) return fail("code_exists", 400);
    }
    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name || d.nameAr || branch.name } : {}),
        ...(d.nameAr !== undefined ? { nameAr: d.nameAr } : {}),
        ...(d.code ? { code: d.code } : {}),
        ...(d.phone !== undefined ? { phone: d.phone } : {}),
        ...(d.managerName !== undefined ? { managerName: d.managerName } : {}),
        ...(d.address !== undefined ? { address: d.address } : {}),
        ...(d.warehouseId !== undefined ? { warehouseId: d.warehouseId } : {}),
        ...(d.status ? { status: d.status } : {}),
      },
    });
    return ok({ data: { id: updated.id, code: updated.code } });
  } catch (e) {
    console.error("branch update error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  try {
    const branch = await prisma.branch.findFirst({ where: { id, companyId: cred.companyId } });
    if (!branch) return notFound();
    const [sales, users, expenses] = await Promise.all([
      prisma.sale.count({ where: { branchId: id } }),
      prisma.user.count({ where: { branchId: id } }),
      prisma.expense.count({ where: { branchId: id } }),
    ]);
    if (sales > 0 || users > 0 || expenses > 0) return fail("in_use", 400);
    await prisma.branch.delete({ where: { id } });
    return ok({ data: { id } });
  } catch (e) {
    console.error("branch delete error", e);
    return serverError();
  }
}