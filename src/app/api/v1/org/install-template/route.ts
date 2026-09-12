import { z } from "zod";
import { ApiError, ok, withRoute } from "@/core/http/api";
import { getTemplate } from "@/core/platform/templates/grocery";
import { prisma } from "@/core/db/client";
import { writeAuditLog } from "@/core/audit/service";

/** Maps template codes to app slugs that should be auto-installed. */
const TEMPLATE_APP_MAP: Record<string, string> = {
  grocery: "grocery",
  clinic: "sama-center",
};

const bodySchema = z.object({
  templateCode: z.string(),
  redirectTo: z.string().optional(),
});

/**
 * POST /api/v1/org/install-template
 *
 * Install a template's matching app into the *current* organization of a
 * signed-in user (skip signup). Response includes the target redirect URL.
 */
export const POST = withRoute("v1.org.installTemplate", async (request) => {
  const body = bodySchema.parse(await request.json().catch(() => null));

  const template = getTemplate(body.templateCode);
  if (!template) throw ApiError.badRequest("Invalid template code");

  const { requireTenantContext } = await import("@/core/tenancy/context");
  const ctx = await requireTenantContext(request);
  const organizationId = ctx.tenant.organizationId;

  const appSlug = TEMPLATE_APP_MAP[template.code];
  if (!appSlug) throw ApiError.badRequest("No app is linked to this template");

  const app = await prisma.app.findUnique({ where: { slug: appSlug } });
  if (!app) throw ApiError.notFound("Application not found");

  const appId = app.id;

  // Idempotent: already installed → just go to my-apps.
  const existing = await prisma.organizationApp.findUnique({
    where: { organizationId_appId: { organizationId, appId } },
  });

  if (!existing) {
    await prisma.organizationApp.create({
      data: {
        organizationId,
        appId,
        status: "active",
        version: app.version,
        activatedAt: new Date(),
      },
    });

    await writeAuditLog(prisma, { organizationId, userId: ctx.tenant.userId }, {
      action: "platform.template.installed",
      entityType: "organizationApp",
      entityId: appId,
      after: { templateCode: template.code, appSlug },
    });
  }

  const redirectTo =
    body.redirectTo && body.redirectTo.startsWith("/")
      ? body.redirectTo
      : "/my-apps";

  return ok({ installed: true, redirectTo });
});
