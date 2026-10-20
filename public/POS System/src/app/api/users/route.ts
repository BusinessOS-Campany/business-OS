import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";
import { hashPassword } from "@/server/auth";

export const dynamic = "force-dynamic";

const UserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nameAr: z.string().trim().max(120).default(""),
  username: z.string().trim().max(60).nullable().optional().default(null),
  email: z.string().trim().email().max(200),
  emailVerified: z.string().optional(),
  phone: z.string().trim().max(30).default(""),
  password: z.string().min(6).max(200),
  language: z.string().default("ar"),
  branchId: z.string().nullable().optional().default(null),
  roleIds: z.array(z.string()).default([]),
  status: z.string().default("ACTIVE"),
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
  const parsed = UserSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const emailUser = await prisma.user.findFirst({ where: { email: d.email } });
    if (emailUser) return fail("email_exists", 400);
    if (d.username) {
      const unameUser = await prisma.user.findUnique({ where: { companyId_username: { companyId: cred.companyId, username: d.username } } });
      if (unameUser) return fail("username_exists", 400);
    }

    const passwordHash = await hashPassword(d.password);

    if (d.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: d.branchId, companyId: cred.companyId } });
      if (!branch) return fail("invalid_fields", 400);
    }
    const validRoles = d.roleIds.length
      ? await prisma.role.count({ where: { id: { in: d.roleIds }, companyId: cred.companyId } })
      : 0;
    if (validRoles !== d.roleIds.length) return fail("invalid_fields", 400);

    const user = await prisma.user.create({
      data: {
        companyId: cred.companyId,
        name: d.name,
        username: d.username || null,
        email: d.email,
        emailVerified: d.emailVerified ? new Date(d.emailVerified) : null,
        passwordHash,
        phone: d.phone,
        language: d.language,
        branchId: d.branchId || null,
        status: d.status as "ACTIVE",
        roles: { create: d.roleIds.map((roleId) => ({ roleId })) },
      },
    });
    return created({ data: { id: user.id, email: user.email } });
  } catch (e) {
    console.error("user create error", e);
    return serverError();
  }
}