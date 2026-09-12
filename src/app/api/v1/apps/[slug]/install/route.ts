import { withRoute, ok } from "@/core/http/api";
import { requireTenantContext } from "@/core/tenancy/context";
import { installApp } from "@/core/apps/service";
import { prisma } from "@/core/db/client";
import { ApiError } from "@/core/http/api";

/**
 * POST /api/v1/apps/[slug]/install
 *
 * Install an application for the current organization.
 * Body: { configuration?: Record<string, unknown> }
 */
export const POST = withRoute<{ params: Promise<{ slug: string }> }>(
  "v1.apps.install",
  async (request, { params }) => {
    const ctx = await requireTenantContext(request);
    const { slug } = await params;

    // Only owner or admin can install apps
    if (ctx.tenant.role !== "owner" && ctx.tenant.role !== "admin") {
      throw ApiError.forbidden("Only organization owners and admins can install applications");
    }

    // Find the app by slug
    const app = await prisma.app.findUnique({ where: { slug } });
    if (!app) {
      throw ApiError.notFound("Application not found");
    }

    const body = await request.json().catch(() => ({}));

    const orgApp = await installApp(ctx.tenant.organizationId, {
      appId: app.id,
      configuration: body.configuration,
    });

    return ok(orgApp);
  },
);
