import { ok, withRoute, ApiError } from "@/core/http/api";
import { auth } from "@/core/auth/server";
import { resolveTenantContext } from "@/core/tenancy/context";

export const POST = withRoute("v1.organizations.active", async (request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session) throw ApiError.unauthorized();

  const body = (await request.json().catch(() => null)) as
    | { organizationId?: string; organizationSlug?: string }
    | null;
  if (!body?.organizationId && !body?.organizationSlug) {
    throw ApiError.badRequest("organizationId or organizationSlug is required");
  }

  await auth.api.setActiveOrganization({
    body,
    headers: request.headers,
  });

  const ctx = await resolveTenantContext(request);
  return ok({ tenant: ctx?.tenant ?? null });
});
