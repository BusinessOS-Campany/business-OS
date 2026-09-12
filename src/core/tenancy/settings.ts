import { prisma } from "@/core/db/client";
import type { ModuleName } from "@/core/permissions/catalog";

/**
 * Org settings live in organizations.settings JSON. Typed accessors + deep
 * merge updates keep call sites honest without a migration per field.
 */
export interface Branding {
  primary?: string;
  accent?: string;
  radius?: number;
  logoUrl?: string;
  displayNameOverride?: string;
}

export interface OrgSettings {
  locale?: "ar" | "en";
  branding?: Branding;
  modulesEnabled?: ModuleName[];
  [key: string]: unknown;
}

const DEFAULTS: Required<Pick<OrgSettings, "locale">> = { locale: "ar" };

export async function getOrgSettings(organizationId: string): Promise<OrgSettings> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  return { ...DEFAULTS, ...((org?.settings as OrgSettings | null) ?? {}) };
}

/** Deep-merges patch into settings and persists. Returns the new settings. */
export async function updateOrgSettings(
  organizationId: string,
  patch: Record<string, unknown>,
): Promise<OrgSettings> {
  const current = await getOrgSettings(organizationId);
  const merged = deepMerge(current as Record<string, unknown>, patch) as OrgSettings;
  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: merged as never },
  });
  return merged;
}

export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const bv = out[k];
      out[k] =
        bv !== null && typeof bv === "object" && !Array.isArray(bv)
          ? deepMerge(bv as Record<string, unknown>, v as Record<string, unknown>)
          : v;
    } else if (v === undefined) {
      delete out[k];
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Strict module gate: when modulesEnabled is set, only listed modules pass. */
export function isModuleEnabled(settings: OrgSettings, moduleName: ModuleName): boolean {
  const enabled = settings.modulesEnabled;
  if (!enabled) return true; // unset => all enabled (back-compat)
  return enabled.includes(moduleName);
}

/** CSS custom properties for the tenant shell from branding tokens. */
export function brandingCssVars(branding: Branding | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!branding) return vars;
  if (branding.primary) vars["--brand-primary"] = branding.primary;
  if (branding.accent) vars["--brand-accent"] = branding.accent;
  if (typeof branding.radius === "number") vars["--brand-radius"] = `${branding.radius}px`;
  return vars;
}
