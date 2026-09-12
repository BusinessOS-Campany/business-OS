import { prisma } from "@/core/db/client";
import { ApiError } from "@/core/http/api";
import type {
  AppMetadata,
  AppInstallStatus,
  OrganizationApp,
} from "./types";
import { installAppSchema } from "./types";
import { appRegistry } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;

/**
 * Reduce app metadata to a JSON-serializable shape for the `app` registry row.
 * `aiTools[].parametersSchema` and `configurationSchema` hold live Zod schemas
 * (functions) which cannot be stored in a JSON column — they are re-derived at
 * runtime from the adapters via getAITools()/getSettingsSchema(), so we persist
 * only the metadata and omit the schema objects.
 */
export function sanitizeAiTools(tools: unknown): AnyJson | undefined {
  if (!Array.isArray(tools)) return undefined;
  return tools.map((tool) => {
    const { parametersSchema: _ps, ...rest } = (tool ?? {}) as Record<string, unknown>;
    void _ps;
    return rest;
  });
}

export function sanitizeConfigurationSchema(schema: unknown): AnyJson | undefined {
  if (schema === undefined || schema === null) return undefined;
  return JSON.parse(JSON.stringify(schema, (_k, v) => (typeof v === "function" ? undefined : v)));
}

// ── App Management Service ─────────────────────────────────────────────────
// Handles installing, activating, disabling, and querying applications
// for a specific organization. All operations are tenant-scoped.

/**
 * Get all apps installed by an organization.
 */
export async function getOrganizationApps(
  organizationId: string,
): Promise<OrganizationApp[]> {
  const rows = await prisma.organizationApp.findMany({
    where: { organizationId },
    orderBy: { installedAt: "desc" },
  });
  return rows.map(formatOrgApp);
}

/**
 * Get a specific installed app for an organization.
 */
export async function getOrganizationApp(
  organizationId: string,
  appId: string,
): Promise<OrganizationApp | null> {
  const row = await prisma.organizationApp.findUnique({
    where: { organizationId_appId: { organizationId, appId } },
  });
  return row ? formatOrgApp(row) : null;
}

/**
 * Check if an organization has a specific app installed and active.
 */
export async function isAppActive(
  organizationId: string,
  appSlug: string,
): Promise<boolean> {
  const app = await prisma.app.findUnique({ where: { slug: appSlug } });
  if (!app) return false;

  const orgApp = await prisma.organizationApp.findUnique({
    where: { organizationId_appId: { organizationId, appId: app.id } },
  });
  return orgApp?.status === "active";
}

/**
 * Install an application for an organization.
 * Validates the app exists, isn't already installed, and applies default config.
 */
export async function installApp(
  organizationId: string,
  input: { appId: string; configuration?: Record<string, unknown> },
): Promise<OrganizationApp> {
  const parsed = installAppSchema.parse(input);

  // Verify app exists in registry
  const app = await prisma.app.findUnique({ where: { id: parsed.appId } });
  if (!app) {
    throw ApiError.notFound("Application not found");
  }
  if (!app.isActive) {
    throw ApiError.badRequest("Application is not available");
  }

  // Check not already installed
  const existing = await prisma.organizationApp.findUnique({
    where: { organizationId_appId: { organizationId, appId: app.id } },
  });
  if (existing) {
    throw ApiError.badRequest("Application is already installed");
  }

  const orgApp = await prisma.organizationApp.create({
    data: {
      organizationId,
      appId: app.id,
      status: "active",
      version: app.version,
      configuration: (parsed.configuration as AnyJson) ?? undefined,
      activatedAt: new Date(),
    },
  });

  return formatOrgApp(orgApp);
}

/**
 * Update an installed app's status (activate, disable, suspend).
 */
export async function updateAppStatus(
  organizationId: string,
  appId: string,
  status: AppInstallStatus,
): Promise<OrganizationApp> {
  const orgApp = await prisma.organizationApp.findUnique({
    where: { organizationId_appId: { organizationId, appId } },
  });
  if (!orgApp) {
    throw ApiError.notFound("Application is not installed");
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "active") updateData.activatedAt = new Date();
  if (status === "disabled") updateData.disabledAt = new Date();

  const updated = await prisma.organizationApp.update({
    where: { id: orgApp.id },
    data: updateData,
  });

  return formatOrgApp(updated);
}

/**
 * Uninstall (disable + remove) an app from an organization.
 * Does NOT delete any app data — just removes access.
 */
export async function uninstallApp(
  organizationId: string,
  appId: string,
): Promise<void> {
  const orgApp = await prisma.organizationApp.findUnique({
    where: { organizationId_appId: { organizationId, appId } },
  });
  if (!orgApp) {
    throw ApiError.notFound("Application is not installed");
  }

  await prisma.organizationApp.delete({ where: { id: orgApp.id } });
}

/**
 * Update an installed app's configuration.
 */
export async function updateAppConfiguration(
  organizationId: string,
  appId: string,
  configuration: Record<string, unknown>,
): Promise<OrganizationApp> {
  const orgApp = await prisma.organizationApp.findUnique({
    where: { organizationId_appId: { organizationId, appId } },
  });
  if (!orgApp) {
    throw ApiError.notFound("Application is not installed");
  }

  const updated = await prisma.organizationApp.update({
    where: { id: orgApp.id },
    data: { configuration: configuration as AnyJson },
  });

  return formatOrgApp(updated);
}

/**
 * Get all available apps from the registry (for marketplace display).
 * Cross-references with what the organization already has installed.
 */
export async function getAvailableApps(organizationId: string) {
  const allApps = await prisma.app.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const installed = await prisma.organizationApp.findMany({
    where: { organizationId },
  });

  const installedMap = new Map(installed.map((ia) => [ia.appId, ia.status]));

  return allApps.map((app) => ({
    ...app,
    installStatus: installedMap.get(app.id) ?? null,
  }));
}

/**
 * Seed a set of apps into the registry (platform admin operation).
 */
export async function registerAppsInDb(
  apps: AppMetadata[],
): Promise<void> {
  for (const meta of apps) {
    await prisma.app.upsert({
      where: { slug: meta.slug },
      create: {
        slug: meta.slug,
        name: meta.name,
        nameAr: meta.nameAr,
        description: meta.description,
        descriptionAr: meta.descriptionAr,
        icon: meta.icon,
        category: meta.category,
        version: meta.version,
        routePrefix: meta.routePrefix,
        capabilities: meta.capabilities as AnyJson,
        permissions: meta.permissions as AnyJson,
        navigation: meta.navigation as AnyJson,
        configurationSchema: sanitizeConfigurationSchema(meta.configurationSchema),
        dashboardWidgets: (meta.dashboardWidgets as AnyJson) ?? undefined,
        aiTools: sanitizeAiTools(meta.aiTools),
      },
      update: {
        name: meta.name,
        nameAr: meta.nameAr,
        description: meta.description,
        descriptionAr: meta.descriptionAr,
        icon: meta.icon,
        version: meta.version,
        capabilities: meta.capabilities as AnyJson,
        permissions: meta.permissions as AnyJson,
        navigation: meta.navigation as AnyJson,
      },
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatOrgApp(row: any): OrganizationApp {
  return {
    id: row.id,
    organizationId: row.organizationId,
    appId: row.appId,
    status: row.status as AppInstallStatus,
    version: row.version,
    configuration: row.configuration ?? undefined,
    settings: row.settings ?? undefined,
    installedAt: row.installedAt,
    activatedAt: row.activatedAt ?? undefined,
    disabledAt: row.disabledAt ?? undefined,
  };
}
