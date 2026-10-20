import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";
import { hashPassword } from "@/server/auth";

export const dynamic = "force-dynamic";

const UserPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  nameAr: z.string().trim().max(120).optional(),
  username: z.string().trim().max(60).nullable().optional(),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(6).max(200).optional(),
  language: z.string().optional(),
  branchId: z.string().nullable().optional(),
  roleIds: z.array(z.string()).optional(),
  status: z.string().optional(),
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
  const parsed = UserPatchSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const user = await prisma.user.findFirst({ where: { id, companyId: cred.companyId } });
    if (!user) return notFound();

    if (d.email && d.email !== user.email) {
      const dup = await prisma.user.findFirst({ where: { email: d.email } });
      if (dup) return fail("email_exists", 400);
    }
    if (d.username && d.username !== user.username) {
      const dup = await prisma.user.findUnique({ where: { companyId_username: { companyId: cred.companyId, username: d.username } } });
      if (dup) return fail("username_exists", 400);
    }
    if (d.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: d.branchId, companyId: cred.companyId } });
      if (!branch) return fail("invalid_fields", 400);
    }
    if (d.roleIds) {
      const validRoles = d.roleIds.length
        ? await prisma.role.count({ where: { id: { in: d.roleIds }, companyId: cred.companyId } })
        : 0;
      if (validRoles !== d.roleIds.length) return fail("invalid_fields", 400);
    }

    const data: Record<string, unknown> = {};
    if (d.name !== undefined) data.name = d.name;
    if (d.username !== undefined) data.username = d.username;
    if (d.email !== undefined) data.email = d.email;
    if (d.phone !== undefined) data.phone = d.phone;
    if (d.language !== undefined) data.language = d.language;
    if (d.branchId !== undefined) data.branchId = d.branchId;
    if (d.status !== undefined) data.status = d.status;
    if (d.password) data.passwordHash = await hashPassword(d.password);

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id }, data });
      }
      if (d.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (d.roleIds.length > 0) {
          await tx.userRole.createMany({ data: d.roleIds.map((roleId) => ({ userId: id, roleId })) });
        }
      }
    });

    return ok({ data: { id } });
  } catch (e) {
    console.error("user update error", e);
    return serverError();
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cred = await (async () => {
    const session = await getSession();
    if (!session || !session.user.companyId) return null;
    const permissions = new Set<string>();
    for (const ur of session.user.roles) {
      for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
    }
    if (!session.user.isSuperAdmin && !permissions.has("user.manage")) return null;
    return { companyId: session.user.companyId, userId: session.user.id };
  })();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  try {
    const user = await prisma.user.findFirst({ where: { id, companyId: cred.companyId } });
    if (!user) return notFound();
    if (user.id === cred.userId) return fail("self_delete", 400);
    if (user.isSuperAdmin) return fail("in_use", 400);

    const [sales, purchases, expenses, journalCount] = await Promise.all([
      prisma.sale.count({ where: { OR: [{ cashierId: id }, { closedById: id }, { cancelledById: id }] } }),
      prisma.purchase.count({ where: { createdById: id } }),
      prisma.expense.count({ where: { OR: [{ createdById: id }, { approvedById: id }] } }),
      prisma.journalEntry.count({ where: { createdById: id } }),
    ]);
    if (sales > 0 || purchases > 0 || expenses > 0 || journalCount > 0) return fail("in_use", 400);

    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id ?? "" } });
      await tx.user.delete({ where: { id } });
    });
    return ok({ data: { id } });
  } catch (e) {
    console.error("user delete error", e);
    return serverError();
  }
}