import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { ok, created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

export const customerSchema = z.object({
  nameAr: z.string().trim().default(""),
  nameEn: z.string().trim().default(""),
  phone: z.string().trim().max(32).default(""),
  phoneAlt: z.string().trim().max(32).default(""),
  email: z.string().trim().max(128).default(""),
  address: z.string().trim().max(255).default(""),
  governorate: z.string().trim().max(64).default(""),
  district: z.string().trim().max(64).default(""),
  type: z.enum(["WALK_IN", "RETAIL", "WHOLESALE", "VIP", "CREDIT"]).default("RETAIL"),
  creditLimit: z.number().int().nonnegative().default(0),
  openingBalance: z.number().int().nonnegative().default(0),
  notes: z.string().trim().max(500).default(""),
  isActive: z.boolean().default(true),
});

async function canManageId() {
  const session = await getSession();
  if (!session || !session.user.companyId) return null;
  const permissions = new Set<string>();
  for (const ur of session.user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
  }
  return session.user.isSuperAdmin || permissions.has("customer.manage") ? session.user.companyId : "";
}

export async function POST(request: Request) {
  try {
    const companyId = await canManageId();
    if (companyId === null) return unauthorized();
    if (companyId === "") return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    if (!d.nameAr.trim() && !d.nameEn.trim()) return fail("Invalid input", 400);

    const existing = await prisma.customer.findMany({ where: { companyId }, select: { number: true } });
    let maxNo = 1000;
    for (const c of existing) {
      const m = /^CUS-(\d+)$/.exec(c.number);
      if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10));
    }
    const number = `CUS-${maxNo + 1}`;

    const customer = await prisma.customer.create({
      data: {
        companyId,
        number,
        name: d.nameAr || d.nameEn || `CUS-${maxNo + 1}`,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        phone: d.phone,
        phoneAlt: d.phoneAlt,
        email: d.email,
        address: d.address,
        governorate: d.governorate,
        district: d.district,
        type: d.type,
        creditLimit: BigInt(d.creditLimit),
        openingBalance: BigInt(d.openingBalance),
        balance: BigInt(d.openingBalance),
        notes: d.notes,
        isActive: d.isActive,
      },
    });

    return created({ id: customer.id, number });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("create customer error", e);
    return serverError();
  }
}