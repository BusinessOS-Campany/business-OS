import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { created, fail, forbidden, ok, notFound, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const CatSchema = z.object({
  name: z.string().trim().min(1).max(60),
  nameAr: z.string().trim().max(60).default(""),
  icon: z.string().trim().max(40).default(""),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("expense.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function POST(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = CatSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const dup = await prisma.expenseCategory.findUnique({ where: { companyId_name: { companyId: cred.companyId, name: d.name } } });
    if (dup) return fail("name_exists", 400);
    const cat = await prisma.expenseCategory.create({
      data: { companyId: cred.companyId, name: d.name, nameAr: d.nameAr, icon: d.icon },
    });
    return created({ data: { id: cat.id, name: cat.name } });
  } catch (e) {
    console.error("expense category create error", e);
    return serverError();
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = CatSchema.partial().safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);

  try {
    const cat = await prisma.expenseCategory.findFirst({ where: { id, companyId: cred.companyId } });
    if (!cat) return notFound();
    const updated = await prisma.expenseCategory.update({ where: { id }, data: parsed.data });
    return ok({ data: { id: updated.id } });
  } catch (e) {
    console.error("expense category update error", e);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const { id } = await params;
  try {
    const cat = await prisma.expenseCategory.findFirst({ where: { id, companyId: cred.companyId } });
    if (!cat) return notFound();
    const used = await prisma.expense.count({ where: { categoryId: id } });
    if (used > 0) return fail("in_use", 400);
    await prisma.expenseCategory.delete({ where: { id } });
    return ok({ data: { id } });
  } catch (e) {
    console.error("expense category delete error", e);
    return serverError();
  }
}