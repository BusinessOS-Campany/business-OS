import { z } from "zod";
import { ok, withRoute } from "@/core/http/api";
import { requireTenantContext } from "@/core/tenancy/context";
import { requirePermission } from "@/core/db/tenant-guard";
import { getOrgSettings, updateOrgSettings } from "@/core/tenancy/settings";
import type { ModuleName } from "@/core/permissions/catalog";

const patchSchema = z.object({
  locale: z.enum(["ar", "en"]).optional(),
  branding: z
    .object({
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      radius: z.number().int().min(0).max(24),
      logoUrl: z.string().url().max(500),
      displayNameOverride: z.string().max(60),
    })
    .partial()
    .optional(),
  modulesEnabled: z.array(z.string()).max(32).optional(),
});

export const GET = withRoute("v1.settings.get", async (request) => {
  const { tenant } = await requireTenantContext(request);
  return ok({ settings: await getOrgSettings(tenant.organizationId) });
});

/** Tenant settings + appearance builder endpoint (controlled tokens only). */
export const PATCH = withRoute("v1.settings.patch", async (request) => {
  const { tenant } = await requireTenantContext(request);
  const body = patchSchema.parse(await request.json().catch(() => null));

  if (body.branding || body.modulesEnabled) {
    requirePermission(tenant, { settings: ["manage"] });
  }

  const settings = await updateOrgSettings(tenant.organizationId, {
    ...(body.locale ? { locale: body.locale } : {}),
    ...(body.branding ? { branding: body.branding } : {}),
    ...(body.modulesEnabled ? { modulesEnabled: body.modulesEnabled as ModuleName[] } : {}),
  });
  return ok({ settings });
});
