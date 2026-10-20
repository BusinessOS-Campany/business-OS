import { getSession } from "@/server/session";
import { created, fail, forbidden, unauthorized, serverError, zodErrors } from "@/lib/api";
import { createPurchaseSchema, createPurchase, PurchaseError } from "@/lib/purchase-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.user.companyId) return unauthorized();

    const permissions = new Set<string>();
    for (const ur of session.user.roles) {
      for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
    }
    if (!session.user.isSuperAdmin && !permissions.has("purchase.manage")) return forbidden();

    const body = await request.json().catch(() => null);
    const parsed = createPurchaseSchema.safeParse(body);
    if (!parsed.success) return fail(zodErrors(parsed.error), 400);

    const branchId = session.user.branchId ?? session.user.companyId;
    if (!branchId || typeof branchId !== "string") return fail("no_branch", 400);

    const result = await createPurchase(
      { companyId: session.user.companyId, userId: session.user.id, branchId },
      parsed.data,
    );
    return created(result);
  } catch (e) {
    if (e instanceof PurchaseError) return fail(e.message, 400);
    console.error("create purchase error", e);
    return serverError();
  }
}