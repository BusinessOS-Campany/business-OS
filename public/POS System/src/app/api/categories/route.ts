import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1),
  nameAr: z.string().trim().default(""),
  nameEn: z.string().trim().default(""),
  icon: z.string().trim().max(32).default(""),
  color: z.string().trim().max(16).default(""),
  sortOrder: z.number().int().default(0),
});

async function canManageId() {
  const session = await getSession();
  if (!session || !session.user.companyId) return null;
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  return session.user.isSuperAdmin || permissions.has("category.manage") ? session.user.companyId : "";
}

export async function POST(request: Request) {
  try {
    const companyId = await canManageId();
    if (companyId === null) return unauthorized();
    if (companyId === "") return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    const dup = await prisma.category.findFirst({ where: { companyId, name: d.name } });
    if (dup) return fail("exists", 400);

    const category = await prisma.category.create({
      data: { companyId, name: d.name, nameAr: d.nameAr, nameEn: d.nameEn, icon: d.icon, color: d.color, sortOrder: d.sortOrder },
    });

    return created({ id: category.id });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("create category error", e);
    return serverError();
  }
}