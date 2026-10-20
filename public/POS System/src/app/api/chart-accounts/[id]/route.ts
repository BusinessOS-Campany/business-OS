import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const AccountPatchSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().max(120).optional(),
  nameAr: z.string().trim().max(120).optional(),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("accounting.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = AccountPatchSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const account = await prisma.account.findFirst({ where: { id, companyId: cred.companyId } });
    if (!account) return notFound();

    if (d.code && d.code !== account.code) {
      if (account.isSystem) return fail("system_account", 400);
      const dup = await prisma.account.findUnique({ where: { companyId_code: { companyId: cred.companyId, code: d.code } } });
      if (dup) return fail("code_exists", 400);
    }
    if (d.type && d.type !== account.type) {
      if (account.isSystem) return fail("system_account", 400);
      const childCount = await prisma.account.count({ where: { parentId: id } });
      if (childCount > 0) return fail("has_children", 400);
    }
    if (d.parentId === id) return fail("parent_self", 400);
    if (d.parentId) {
      const parent = await prisma.account.findFirst({ where: { id: d.parentId, companyId: cred.companyId } });
      if (!parent) return fail("parent_not_found", 400);
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(d.code ? { code: d.code } : {}),
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.nameAr !== undefined ? { nameAr: d.nameAr } : {}),
        ...(d.type ? { type: d.type } : {}),
        ...(d.parentId !== undefined ? { parentId: d.parentId } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    });
    return ok({ data: { id: updated.id, code: updated.code } });
  } catch (e) {
    console.error("chart account update error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;

  try {
    const account = await prisma.account.findFirst({ where: { id, companyId: cred.companyId } });
    if (!account) return notFound();
    if (account.isSystem) return fail("system_account", 400);

    const childCount = await prisma.account.count({ where: { parentId: id } });
    const lineCount = await prisma.journalLine.count({ where: { accountId: id } });
    if (childCount > 0 || lineCount > 0) return fail("in_use", 400);

    await prisma.account.delete({ where: { id } });
    return ok({ data: { id } });
  } catch (e) {
    console.error("chart account delete error", e);
    return serverError();
  }
}