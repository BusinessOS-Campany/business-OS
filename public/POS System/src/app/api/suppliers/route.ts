import { z } from "zod";
import { getSession } from "@/server/session";
import { prisma } from "@/lib/prisma";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

export const supplierSchema = z.object({
  nameAr: z.string().trim().default(""),
  nameEn: z.string().trim().default(""),
  companyName: z.string().trim().default(""),
  type: z.enum(["COMPANY", "INDIVIDUAL"]).default("COMPANY"),
  phone: z.string().trim().max(32).default(""),
  phoneAlt: z.string().trim().max(32).default(""),
  email: z.string().trim().max(128).default(""),
  address: z.string().trim().max(255).default(""),
  governorate: z.string().trim().max(64).default(""),
  district: z.string().trim().max(64).default(""),
  contactPerson: z.string().trim().max(64).default(""),
  taxNumber: z.string().trim().max(64).default(""),
  paymentTerms: z.string().trim().max(128).default(""),
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
  return session.user.isSuperAdmin || permissions.has("supplier.manage") ? session.user.companyId : "";
}

export async function POST(request: Request) {
  try {
    const companyId = await canManageId();
    if (companyId === null) return unauthorized();
    if (companyId === "") return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);
    const d = parsed.data;

    if (!d.nameAr.trim() && !d.nameEn.trim() && !d.companyName.trim()) return fail("Invalid input", 400);

    const supplier = await prisma.supplier.create({
      data: {
        companyId,
        name: d.nameAr || d.nameEn || d.companyName,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        companyName: d.companyName,
        type: d.type,
        phone: d.phone,
        phoneAlt: d.phoneAlt,
        email: d.email,
        address: d.address,
        governorate: d.governorate,
        district: d.district,
        contactPerson: d.contactPerson,
        taxNumber: d.taxNumber,
        paymentTerms: d.paymentTerms,
        creditLimit: BigInt(d.creditLimit),
        openingBalance: BigInt(d.openingBalance),
        notes: d.notes,
        isActive: d.isActive,
      },
    });

    return created({ id: supplier.id });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("create supplier error", e);
    return serverError();
  }
}