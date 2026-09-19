import { z } from "zod";
import { getSession } from "@/server/session";
import { createSale, createSaleSchema, SaleError } from "@/lib/sales-service";
import { ok, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user.companyId) return unauthorized();

    const permissions = new Set<string>();
    for (const ur of session.user.roles) {
      for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
    }
    if (!session.user.isSuperAdmin && !permissions.has("sale.create")) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);

    const result = await createSale(
      {
        companyId: session.user.companyId,
        userId: session.user.id,
        branchId: session.user.branchId ?? "",
        terminalId: session.user.terminalId,
      },
      parsed.data
    );
    return ok(result, 201);
  } catch (e) {
    if (e instanceof SaleError) return fail(e.message, 400);
    if (e instanceof z.ZodError) return fail(zodErrors(e), 400);
    console.error("create sale error", e);
    return serverError();
  }
}