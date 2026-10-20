import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const RolePatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  nameAr: z.string().trim().max(80).optional(),
  description: z.string().trim().max(255).optional(),
  keys: z.array(z.string()).optional(),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("user.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = RolePatchSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const role = await prisma.role.findFirst({ where: { id, companyId: cred.companyId } });
    if (!role) return notFound();
    if (role.isSystem) return fail("system_role", 400);

    if (d.name && d.name !== role.name) {
      const dup = await prisma.role.findUnique({ where: { companyId_name: { companyId: cred.companyId, name: d.name } } });
      if (dup) return fail("name_exists", 400);
    }
    if (d.keys) {
      const validPerms = d.keys.length ? await prisma.permission.count({ where: { key: { in: d.keys } } }) : 0;
      if (validPerms !== d.keys.length) return fail("invalid_fields", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          ...(d.name !== undefined ? { name: d.name || d.nameAr || role.name } : {}),
          ...(d.nameAr !== undefined ? { nameAr: d.nameAr } : {}),
          ...(d.description !== undefined ? { description: d.description } : {}),
        },
      });
      if (d.keys) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (d.keys.length > 0) {
          const pmap = await tx.permission.findMany({ where: { key: { in: d.keys } }, select: { id: true } });
          await tx.rolePermission.createMany({ data: pmap.map((p) => ({ roleId: id, permissionId: p.id })) });
        }
      }
    });

    return ok({ data: { id } });
  } catch (e) {
    console.error("role update error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  try {
    const role = await prisma.role.findFirst({ where: { id, companyId: cred.companyId } });
    if (!role) return notFound();
    if (role.isSystem) return fail("system_role", 400);
    const users = await prisma.userRole.count({ where: { roleId: id } });
    if (users > 0) return fail("in_use", 400);
    await prisma.role.delete({ where: { id } });
    return ok({ data: { id } });
  } catch (e) {
    console.error("role delete error", e);
    return serverError();
  }
}