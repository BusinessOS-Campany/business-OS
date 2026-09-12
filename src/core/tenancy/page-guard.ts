import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/core/auth/server";
import { resolveTenantContext, type TenantResolution } from "@/core/tenancy/context";
import { hasPermission } from "@/core/db/tenant-guard";
import type { PermissionStatement } from "@/core/permissions/catalog";

/**
 * Server-component variant of the tenant guard: redirects instead of throwing
 * API errors so RSC pages degrade gracefully.
 */
export async function requireTenantPage(
  permission?: PermissionStatement,
): Promise<TenantResolution> {
  // resolveTenantContext speaks the fetch Request interface; RSC gives us
  // raw Headers, so wrap them.
  const req = new Request("http://internal/rsc", { headers: await headers() });
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) redirect("/signin");

  const ctx = await resolveTenantContext(req);
  if (!ctx) redirect("/select-org");

  if (permission && !hasPermission(ctx.tenant.role, permission)) {
    redirect("/app?denied=1");
  }
  return ctx;
}
