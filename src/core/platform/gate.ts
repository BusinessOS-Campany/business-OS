import { auth } from "@/core/auth/server";
import { prisma } from "@/core/db/client";
import { ApiError } from "@/core/http/api";
import type { TenantResolution } from "@/core/tenancy/context";

/**
 * Platform realm gate: only user.role === "admin" (Better Auth admin plugin)
 * may touch /api/platform/* and the platform-admin console.
 */
export async function requirePlatformAdmin(request: Request): Promise<TenantResolution["user"]> {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result?.session) throw ApiError.unauthorized();
  if (result.user.role !== "admin") throw ApiError.forbidden("Platform admin access required");
  return result.user;
}

const SUSPENDED = new Set(["suspended", "cancelled"]);

/**
 * Loads org status for the active tenant; blocks suspended/cancelled tenants
 * from all tenant-scoped API traffic (called by tenant routes via requireTenantContext
 * extension points, and by M3's UI shell).
 */
export async function assertOrganizationActive(organizationId: string): Promise<{ status: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true },
  });
  if (!org) throw ApiError.forbidden("Organization not found");
  if (SUSPENDED.has(org.status)) {
    throw new ApiError(
      402,
      "ORGANIZATION_SUSPENDED",
      "تم إيقاف حساب المؤسسة، يرجى التواصل مع الدعم",
      "This organization is suspended. Contact support.",
    );
  }
  return org;
}
