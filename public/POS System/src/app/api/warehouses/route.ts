import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const WhSchema = z
  .object({
    name: z.string().trim().max(120).default(""),
    nameAr: z.string().trim().max(120).default(""),
    code: z.string().trim().min(1).max(30),
    address: z.string().trim().max(255).default(""),
    phone: z.string().trim().max(30).default(""),
    managerName: z.string().trim().max(120).default(""),
    isMain: z.boolean().default(false),
  })
  .refine((v) => v.name || v.nameAr, { message: "name_required" });

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("warehouse.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function POST(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();
  if (!cred.companyId) return forbidden();

  const body = await request.json().catch(() => null);
  const parsed = WhSchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);
  const d = parsed.data;

  try {
    const dup = await prisma.warehouse.findUnique({ where: { companyId_code: { companyId: cred.companyId, code: d.code } } });
    if (dup) return fail("code_exists", 400);

    if (d.isMain) {
      await prisma.warehouse.updateMany({ where: { companyId: cred.companyId, isMain: true }, data: { isMain: false } });
    }

    const wh = await prisma.warehouse.create({
      data: {
        companyId: cred.companyId,
        name: d.name || d.nameAr,
        nameAr: d.nameAr,
        code: d.code,
        address: d.address,
        phone: d.phone,
        managerName: d.managerName,
        isMain: d.isMain,
      },
    });
    return created({ data: { id: wh.id, code: wh.code } });
  } catch (e) {
    console.error("warehouse create error", e);
    return serverError();
  }
}