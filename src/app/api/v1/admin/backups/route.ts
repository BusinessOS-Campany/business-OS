import { z } from "zod";
import { ok, withRoute } from "@/core/http/api";
import { requireTenantContext } from "@/core/tenancy/context";
import { requirePermission } from "@/core/db/tenant-guard";
import { prisma } from "@/core/db/client";
import { createBackup, listBackups, verifyBackup } from "@/core/integrations/backup";

export const GET = withRoute("v1.admin.backups.list", async (request) => {
  const { tenant } = await requireTenantContext(request);
  requirePermission(tenant, { integrations: ["read"] });

  const backups = await listBackups(prisma, tenant.organizationId);
  return ok({ backups });
});

export const POST = withRoute("v1.admin.backups.create", async (request) => {
  const { tenant } = await requireTenantContext(request);
  requirePermission(tenant, { integrations: ["manage"] });

  const result = await createBackup(prisma, tenant);
  return ok({ backup: result }, { status: 201 });
});

const verifySchema = z.object({ backupId: z.string().min(1) });

export const PUT = withRoute("v1.admin.backups.verify", async (request) => {
  const { tenant } = await requireTenantContext(request);
  requirePermission(tenant, { integrations: ["manage"] });
  const body = verifySchema.parse(await request.json().catch(() => null));

  const result = await verifyBackup(prisma, tenant, body.backupId);
  return ok(result);
});
