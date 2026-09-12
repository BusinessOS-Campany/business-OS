import { z } from "zod";
import { ok, withRoute } from "@/core/http/api";
import { requireTenantContext } from "@/core/tenancy/context";

import { listPatients, createPatient, createPatientSchema } from "@/core/sama/patients";

export const GET = withRoute("v1.sama-center.patients.list", async (request) => {
  const { tenant } = await requireTenantContext(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 20);

  const result = await listPatients(tenant.organizationId, { search, status, page, pageSize });
  return ok(result);
});

export const POST = withRoute("v1.sama-center.patients.create", async (request) => {
  const { tenant } = await requireTenantContext(request);

  const body = createPatientSchema.parse(await request.json().catch(() => null));
  const patient = await createPatient(
    // @ts-expect-error prisma tx handled internally
    null,
    tenant.organizationId,
    tenant.userId,
    body,
  );
  return ok({ id: patient.id }, { status: 201 });
});
