import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

const CompanySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  nameAr: z.string().trim().max(120).optional(),
  nameEn: z.string().trim().max(120).optional(),
  businessType: z.string().trim().max(60).optional(),
  regNumber: z.string().trim().max(60).optional(),
  taxNumber: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  phoneAlt: z.string().trim().max(30).optional(),
  email: z.string().trim().max(120).optional(),
  address: z.string().trim().max(255).optional(),
  governorate: z.string().trim().max(60).optional(),
  district: z.string().trim().max(60).optional(),
  invoicePrefix: z.string().trim().max(10).optional(),
});

async function guard() {
  const session = await getSession();
  if (!session || !session.user.companyId) return { cred: null };
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  if (!session.user.isSuperAdmin && !permissions.has("settings.manage")) return { cred: null };
  return { cred: { companyId: session.user.companyId } };
}

export async function PATCH(request: Request) {
  const { cred } = await guard();
  if (!cred) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = CompanySchema.safeParse(body);
  if (!parsed.success) return fail(zodErrors(parsed.error), 400);

  try {
    const updated = await prisma.company.update({
      where: { id: cred.companyId },
      data: parsed.data,
    });
    return ok({ data: { id: updated.id, name: updated.name } });
  } catch (e) {
    console.error("company update error", e);
    return serverError();
  }
}