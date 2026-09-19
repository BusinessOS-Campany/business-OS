import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const RoleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameAr: z.string().trim().max(80).default(""),
  description: z.string().trim().max(255).default(""),
  keys: z.array(z.string()).default([]),
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

export async function POST(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = RoleSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const dup = await prisma.role.findUnique({ where: { companyId_name: { companyId: cred.companyId, name: d.name } } });
    if (dup) return fail("name_exists", 400);

    const validPerms = d.keys.length
      ? await prisma.permission.count({ where: { key: { in: d.keys } } })
      : 0;
    if (validPerms !== d.keys.length) return fail("invalid_fields", 400);

    const pmap = d.keys.length
      ? await prisma.permission.findMany({ where: { key: { in: d.keys } }, select: { id: true } })
      : [];

    const role = await prisma.role.create({
      data: {
        companyId: cred.companyId,
        name: d.name,
        nameAr: d.nameAr,
        description: d.description,
        isSystem: false,
        permissions: { create: pmap.map((p) => ({ permissionId: p.id })) },
      },
    });
    return created({ data: { id: role.id, name: role.name } });
  } catch (e) {
    console.error("role create error", e);
    return serverError();
  }
}