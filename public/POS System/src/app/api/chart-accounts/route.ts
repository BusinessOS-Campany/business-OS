import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const AccountSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().max(120).default(""),
  nameAr: z.string().trim().max(120).default(""),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  parentId: z.string().nullable().optional().default(null),
  isActive: z.boolean().default(true),
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

export async function POST(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = AccountSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const dup = await prisma.account.findUnique({ where: { companyId_code: { companyId: cred.companyId, code: d.code } } });
    if (dup) return fail("code_exists", 400);

    if (d.parentId) {
      const parent = await prisma.account.findFirst({ where: { id: d.parentId, companyId: cred.companyId } });
      if (!parent) return fail("parent_not_found", 400);
    }

    const account = await prisma.account.create({
      data: {
        companyId: cred.companyId,
        code: d.code,
        name: d.name || d.nameAr,
        nameAr: d.nameAr || d.name,
        type: d.type,
        parentId: d.parentId,
        isActive: d.isActive,
      },
    });
    return created({ data: { id: account.id, code: account.code } });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("chart account create error", e);
    return serverError();
  }
}