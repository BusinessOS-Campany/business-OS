import { ok, withRoute } from "@/core/http/api";
import { requireTenantContext } from "@/core/tenancy/context";
import { prisma } from "@/core/db/client";
import { processSyncBatch } from "@/core/sync/service";
import { syncBatchSchema } from "@/core/sync/types";

/**
 * POST /api/v1/sync — batched offline sync endpoint.
 * Accepts an array of create/update/delete operations from the client outbox.
 * Each op is idempotent via idempotencyKey.
 */
export const POST = withRoute("v1.sync.batch", async (request) => {
  const { tenant } = await requireTenantContext(request);
  const raw = await request.json().catch(() => null);
  const body = syncBatchSchema.parse(raw);

  const result = await processSyncBatch(
    prisma,
    tenant.organizationId,
    tenant.userId,
    body,
  );

  return ok(result);
});
