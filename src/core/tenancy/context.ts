import { auth } from "@/core/auth/server";

type SessionResult = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
}

export interface TenantResolution {
  user: SessionResult["user"];
  session: SessionResult["session"];
  tenant: TenantContext;
}

/**
 * Resolves the tenant context for an API request from the Better Auth session
 * (active organization). Returns null when unauthenticated or when no active
 * organization is set — callers decide between 401 and 403.
 */
export async function resolveTenantContext(request: Request): Promise<TenantResolution | null> {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result?.session) return null;

  const activeOrgId = result.session.activeOrganizationId;
  if (!activeOrgId) return null;

  // Suspension gate (M2): suspended/cancelled tenants are cut off here.
  const { assertOrganizationActive } = await import("@/core/platform/gate");
  await assertOrganizationActive(activeOrgId);

  const org = await auth.api.getFullOrganization({
    headers: request.headers,
    query: { organizationId: activeOrgId },
  });
  const member = org?.members.find((m) => m.userId === result.user.id);
  if (!member) return null;

  return {
    user: result.user,
    session: result.session,
    tenant: {
      organizationId: activeOrgId,
      userId: result.user.id,
      role: member.role,
    },
  };
}

/** Like resolveTenantContext but throws the canonical API errors. */
export async function requireTenantContext(request: Request): Promise<TenantResolution> {
  const ctx = await resolveTenantContext(request);
  if (!ctx) {
    const { ApiError } = await import("@/core/http/api");
    throw ApiError.unauthorized();
  }
  return ctx;
}
