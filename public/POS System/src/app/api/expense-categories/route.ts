import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/session";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

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